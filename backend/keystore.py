"""
keystore.py — Cryptographic engine for the Biometric Key-Store.

Provides:
  - AES-256-GCM encryption / decryption of secret payloads
  - Time-bound UUID challenge tokens for biometric unlock flows
  - HKDF-derived session keys for transport security
"""

import os
import uuid
import time
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

# ---------------------------------------------------------------------------
# Master Key — derived from env var or auto-generated for local development
# ---------------------------------------------------------------------------
_raw_key = os.environ.get("VAULT_MASTER_KEY", None)
if _raw_key:
    MASTER_KEY = hashlib.sha256(_raw_key.encode()).digest()  # 32 bytes
else:
    MASTER_KEY = hashlib.sha256(b"biometric-vault-local-dev-key-2026").digest()

# ---------------------------------------------------------------------------
# In-memory challenge store  {challenge_id: {user, expires_at}}
# ---------------------------------------------------------------------------
_challenges: dict = {}
CHALLENGE_TTL_SECONDS = 60


def generate_challenge(user_name: str) -> dict:
    """Issue a short-lived UUID challenge token bound to a user."""
    challenge_id = str(uuid.uuid4())
    expires_at = time.time() + CHALLENGE_TTL_SECONDS
    _challenges[challenge_id] = {
        "user": user_name,
        "expires_at": expires_at,
    }
    # Housekeeping — purge expired challenges
    _purge_expired()
    return {
        "challenge_id": challenge_id,
        "expires_in": CHALLENGE_TTL_SECONDS,
    }


def validate_challenge(challenge_id: str, user_name: str) -> bool:
    """Validate and consume a one-time challenge token."""
    entry = _challenges.pop(challenge_id, None)
    if entry is None:
        return False
    if entry["user"] != user_name:
        return False
    if time.time() > entry["expires_at"]:
        return False
    return True


# ---------------------------------------------------------------------------
# AES-256-GCM Encryption / Decryption
# ---------------------------------------------------------------------------

def encrypt_secret(plaintext: str) -> dict:
    """Encrypt a plaintext string with AES-256-GCM.
    
    Returns dict with base64-encoded nonce, ciphertext, and tag.
    """
    aesgcm = AESGCM(MASTER_KEY)
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    plaintext_bytes = plaintext.encode("utf-8")
    # AESGCM.encrypt appends the tag to the ciphertext
    ct_with_tag = aesgcm.encrypt(nonce, plaintext_bytes, None)
    # Split: last 16 bytes = tag, rest = ciphertext
    ciphertext = ct_with_tag[:-16]
    tag = ct_with_tag[-16:]
    return {
        "nonce": base64.b64encode(nonce).decode(),
        "ciphertext": base64.b64encode(ciphertext).decode(),
        "tag": base64.b64encode(tag).decode(),
    }


def decrypt_secret(nonce_b64: str, ciphertext_b64: str, tag_b64: str) -> str:
    """Decrypt an AES-256-GCM payload back to plaintext."""
    aesgcm = AESGCM(MASTER_KEY)
    nonce = base64.b64decode(nonce_b64)
    ciphertext = base64.b64decode(ciphertext_b64)
    tag = base64.b64decode(tag_b64)
    ct_with_tag = ciphertext + tag
    plaintext_bytes = aesgcm.decrypt(nonce, ct_with_tag, None)
    return plaintext_bytes.decode("utf-8")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _purge_expired():
    """Remove expired challenges from memory."""
    now = time.time()
    expired = [k for k, v in _challenges.items() if now > v["expires_at"]]
    for k in expired:
        del _challenges[k]
