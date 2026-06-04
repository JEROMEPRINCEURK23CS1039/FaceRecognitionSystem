"""
backend/main.py — AEGIS CORE API Server
FastAPI backend for neural biometric authentication, vault management,
and local LLM-powered security analysis.
"""

import os
import base64
import numpy as np
import cv2
import threading
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import mediapipe as mp

from database import save_user, get_all_users, log_session, get_logs, get_stats, save_secret, get_user_secrets, delete_secret
from keystore import generate_challenge, validate_challenge, encrypt_secret, decrypt_secret
from llm_service import (
    analyze_security_logs, chat_with_assistant, audit_password_strength,
    generate_mnemonic_password, parse_log_search_query,
    get_llm_status, unload_llm, preload_llm, generate_system_security_score
)

# ---------------------------------------------------------------------------
# Lifespan: replaces deprecated @app.on_event("startup")
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    import threading
    print("AEGIS CORE: Pre-loading LLM weights in background...")
    threading.Thread(target=preload_llm, daemon=True).start()
    yield

app = FastAPI(title="AEGIS CORE — Neural Biometric Gateway", lifespan=lifespan)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# MediaPipe Face Mesh — single persistent instance
# ---------------------------------------------------------------------------
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)
face_mesh_lock = threading.Lock()


# Core 42 stable landmark indices representing face structure
STABLE_LANDMARKS = [
    1, 4, 6, 197, 195, 5, 2, 152, 168,   # Nose & centerline
    33, 160, 158, 133, 153, 144,          # Left eye
    362, 385, 387, 263, 373, 380,         # Right eye
    70, 63, 105, 66, 107,                 # Left eyebrow
    300, 293, 334, 296, 336,              # Right eyebrow
    61, 291, 0, 17, 78, 308,             # Mouth outer
    14, 82, 312, 87, 317,                 # Mouth inner
]

LEFT_EYE_IDX  = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_IDX = [362, 385, 387, 263, 373, 380]

# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    name: str
    image: str
    liveness: bool = True

class LoginRequest(BaseModel):
    image: str
    liveness: bool = True

class ChatRequest(BaseModel):
    message: str
    history: list = []

class AuditRequest(BaseModel):
    password: str
    label: str

class GeneratePasswordRequest(BaseModel):
    prompt: str

class LogSearchRequest(BaseModel):
    query: str

class ChallengeRequest(BaseModel):
    user_name: str

class StoreSecretRequest(BaseModel):
    challenge_id: str
    user_name: str
    label: str
    plaintext: str

class UnlockVaultRequest(BaseModel):
    challenge_id: str
    user_name: str

# ---------------------------------------------------------------------------
# Core biometric utilities
# ---------------------------------------------------------------------------
def decode_base64_image(base64_str: str):
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    img_data = base64.b64decode(base64_str)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def enhance_low_light(img):
    yuv = cv2.cvtColor(img, cv2.COLOR_BGR2YUV)
    y, u, v = cv2.split(yuv)
    avg_luminance = np.mean(y)
    status = "Ideal"
    if avg_luminance < 85:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        y = clahe.apply(y)
        gamma = 1.6
        table = np.array([((i / 255.0) ** (1.0 / gamma)) * 255 for i in range(256)], dtype="uint8")
        y = cv2.LUT(y, table)
        status = "Boosting Gain"
    enhanced = cv2.cvtColor(cv2.merge((y, u, v)), cv2.COLOR_YUV2BGR)
    return enhanced, status


def _landmark_vec(lm, idx, aspect_ratio: float = 1.0):
    # Damp the Z-coordinate depth estimation to minimize inter-camera resolution and focal variance
    # Scale X and Z coordinates by aspect ratio to neutralize frame stretching relative to Y (height)
    return np.array([lm[idx].x * aspect_ratio, lm[idx].y, lm[idx].z * 0.1 * aspect_ratio])


def calculate_ear(landmarks, eye_indices, aspect_ratio: float = 1.0):
    p = [_landmark_vec(landmarks, i, aspect_ratio) for i in eye_indices]
    vertical = np.linalg.norm(p[1] - p[5]) + np.linalg.norm(p[2] - p[4])
    horizontal = np.linalg.norm(p[0] - p[3])
    return 0.0 if horizontal == 0 else vertical / (2.0 * horizontal)


def check_face_alignment(landmarks):
    nose      = np.array([landmarks[1].x,   landmarks[1].y])
    left_eye  = np.array([landmarks[33].x,  landmarks[33].y])
    right_eye = np.array([landmarks[263].x, landmarks[263].y])

    dist_r = np.linalg.norm(nose - right_eye)
    if dist_r == 0:
        return "Not Aligned"

    ratio = np.linalg.norm(nose - left_eye) / dist_r
    if ratio < 0.65 or ratio > 1.54:
        return "Face Turned"

    dy = right_eye[1] - left_eye[1]
    dx = right_eye[0] - left_eye[0]
    if dx == 0:
        return "Not Aligned"
    if abs(np.degrees(np.arctan2(dy, dx))) > 15:
        return "Face Tilted"

    return "Perfect"


def extract_biometric_signature(landmarks, aspect_ratio: float = 1.0):
    nose_tip        = _landmark_vec(landmarks, 1, aspect_ratio)
    left_eye_outer  = _landmark_vec(landmarks, 33, aspect_ratio)
    right_eye_outer = _landmark_vec(landmarks, 263, aspect_ratio)
    scale = np.linalg.norm(left_eye_outer - right_eye_outer) or 1.0

    coords = []
    for idx in STABLE_LANDMARKS:
        coords.extend((_landmark_vec(landmarks, idx, aspect_ratio) - nose_tip) / scale)

    # 2 EAR values pad to 128 dimensions total
    coords.append(calculate_ear(landmarks, LEFT_EYE_IDX, aspect_ratio))
    coords.append(calculate_ear(landmarks, RIGHT_EYE_IDX, aspect_ratio))
    return coords


def _format_logs(logs_data: list) -> str:
    return "".join(
        f"[{l['timestamp']}] User: {l['name']} - Event: {l['event']} (Confidence: {l['confidence']}%)\n"
        for l in logs_data
    )

# ---------------------------------------------------------------------------
# Biometric API routes
# ---------------------------------------------------------------------------
@app.post("/api/register")
def register(req: RegisterRequest):
    try:
        img = decode_base64_image(req.image)
        if img is None or img.size == 0:
            raise HTTPException(status_code=400, detail="Invalid or empty camera frame. Please try again.")
        height, width = img.shape[:2]
        aspect_ratio = width / height
        enhanced, status = enhance_low_light(img)
        with face_mesh_lock:
            results = face_mesh.process(cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB))
        if not results.multi_face_landmarks:
            raise HTTPException(status_code=400, detail="No face detected in the image.")
        landmarks = results.multi_face_landmarks[0].landmark
        embedding = extract_biometric_signature(landmarks, aspect_ratio)
        if save_user(req.name, embedding):
            log_session(req.name, "Biometric Enrollment Success", 100.0, req.liveness)
            return {"status": "success", "message": "User registered successfully!", "enhancement": status}
        raise HTTPException(status_code=400, detail="User already registered.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {e}")


@app.post("/api/login")
def login(req: LoginRequest):
    try:
        img = decode_base64_image(req.image)
        if img is None or img.size == 0:
            raise HTTPException(status_code=400, detail="Invalid or empty camera frame. Please try again.")
        height, width = img.shape[:2]
        aspect_ratio = width / height
        enhanced, status = enhance_low_light(img)
        with face_mesh_lock:
            results = face_mesh.process(cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB))
        if not results.multi_face_landmarks:
            raise HTTPException(status_code=400, detail="No face detected in the frame.")
        landmarks = results.multi_face_landmarks[0].landmark

        query_vector = np.array(extract_biometric_signature(landmarks, aspect_ratio))
        avg_ear = float((calculate_ear(landmarks, LEFT_EYE_IDX, aspect_ratio) + calculate_ear(landmarks, RIGHT_EYE_IDX, aspect_ratio)) / 2.0)

        users = get_all_users()
        if not users:
            raise HTTPException(status_code=400, detail="No users registered in biometric vault.")

        best_match = min(users, key=lambda u: np.linalg.norm(query_vector - np.array(u["embedding"])))
        min_distance = np.linalg.norm(query_vector - np.array(best_match["embedding"]))

        threshold = 0.98
        print(f"BIOMETRICS: distance={min_distance:.4f} threshold={threshold}")
        if min_distance < threshold:
            if min_distance <= 0.4:
                confidence = 100.0
            else:
                confidence = 100.0 - (min_distance - 0.4) / (threshold - 0.4) * 50.0
            confidence = round(confidence, 1)
            log_session(best_match["name"], "Facial Login Verified", confidence, req.liveness)
            return {"status": "success", "name": best_match["name"], "confidence": confidence, "ear": avg_ear, "enhancement": status}

        log_session("Unknown", "Access Denied: Similarity Rejected", 0.0, req.liveness)
        raise HTTPException(status_code=401, detail="Biometric identity signature mismatch.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {e}")


@app.post("/api/biometrics/analyze")
def analyze_biometrics(req: LoginRequest):
    try:
        img = decode_base64_image(req.image)
        if img is None or img.size == 0:
            return {"status": "fail", "message": "Invalid or empty image frame", "ear": 0.0, "alignment": "No Face"}
        height, width = img.shape[:2]
        aspect_ratio = width / height
        enhanced, status = enhance_low_light(img)
        with face_mesh_lock:
            results = face_mesh.process(cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB))
        if not results.multi_face_landmarks:
            return {"status": "fail", "message": "No face detected", "ear": 0.0, "alignment": "No Face"}
        landmarks = results.multi_face_landmarks[0].landmark
        avg_ear = float((calculate_ear(landmarks, LEFT_EYE_IDX, aspect_ratio) + calculate_ear(landmarks, RIGHT_EYE_IDX, aspect_ratio)) / 2.0)
        return {"status": "success", "ear": round(avg_ear, 3), "alignment": check_face_alignment(landmarks), "enhancement": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------
# Stats & Logs routes
# ---------------------------------------------------------------------------
@app.get("/api/stats")
def stats():
    return get_stats()


@app.get("/api/logs")
def logs(limit: int = 50):
    return get_logs(limit)


@app.get("/api/logs/analysis")
def logs_analysis():
    logs_data = get_logs(limit=50)
    if not logs_data:
        return {"analysis": "No logs available to analyze."}
    try:
        return {"analysis": analyze_security_logs(_format_logs(logs_data))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Error: {e}")


@app.post("/api/logs/search")
def search_logs(req: LogSearchRequest):
    try:
        return {"filter": parse_log_search_query(req.query)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Log Search Error: {e}")

# ---------------------------------------------------------------------------
# Security score route
# ---------------------------------------------------------------------------
@app.get("/api/security-score")
def security_score():
    logs_data = get_logs(limit=30)
    stats_data = get_stats()
    
    # Try dynamic AI-generated score first
    try:
        formatted_logs = _format_logs(logs_data) if logs_data else "No logs recorded."
        stats_summary = f"Total registered users: {stats_data.get('registered', 0)}\nTotal logins: {stats_data.get('logins', 0)}\nRecent log entries:\n{formatted_logs}"
        ai_score_result = generate_system_security_score(stats_summary)
        # Ensure it has the correct keys and valid types
        if isinstance(ai_score_result, dict) and "score" in ai_score_result and "recommendations" in ai_score_result:
            return ai_score_result
    except Exception as e:
        print(f"AI Security Score failed, falling back to rule-based: {e}")

    if not logs_data:
        return {
            "score": 100,
            "recommendations": [
                "Biometric Vault initialized successfully.",
                "No authentication attempts recorded yet.",
                "Initiate biometric scan to perform active authentication.",
            ],
        }

    recent = next(
        (l for l in logs_data if any(k in l["event"].lower() for k in ("login", "denied", "rejected", "enrollment", "unlocked"))),
        logs_data[0],
    )
    confidence = recent.get("confidence", 0.0)
    event_str  = recent.get("event", "")
    is_success = any(k in event_str.lower() for k in ("verified", "success", "unlocked"))

    if not is_success:
        return {
            "score": int(max(30, min(50, confidence))),
            "recommendations": [
                f"Warning: Unauthorized access attempt blocked ('{event_str}').",
                "Action required: Audit logs for unknown faces or spoofing attacks.",
                "Verify camera lighting is not casting harsh shadows.",
            ],
        }
    if confidence < 65:
        return {
            "score": int(confidence) if confidence > 0 else 60,
            "recommendations": [
                f"Match quality is low ({confidence}%). Sit under better lighting.",
                "Ensure the camera lens is clean and your head is straight.",
                "Avoid backlit environments to reduce verification errors.",
            ],
        }
    if confidence < 85:
        return {
            "score": int(confidence),
            "recommendations": [
                f"Stable biometric match at {confidence}% confidence.",
                "Adjust your camera angle to align nose and eyes with the scanner.",
                "Consistent ambient lighting keeps verification speed optimal.",
            ],
        }
    return {
        "score": int(confidence),
        "recommendations": [
            "Perfect biometric match! Lighting and face alignment are optimal.",
            "Excellent capture quality. Cryptographic keys securely unlocked.",
            "Secure session established. System integrity is verified.",
        ],
    }

# ---------------------------------------------------------------------------
# AI / LLM routes
# ---------------------------------------------------------------------------
@app.post("/api/chat")
def chat(req: ChatRequest):
    logs_data = get_logs(limit=30)
    try:
        return {"response": chat_with_assistant(req.message, req.history, _format_logs(logs_data))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Chat Error: {e}")


@app.post("/api/vault/audit")
def audit(req: AuditRequest):
    try:
        return {"critique": audit_password_strength(req.password, req.label)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Audit Error: {e}")


@app.post("/api/vault/generate-password")
def generate_password(req: GeneratePasswordRequest):
    try:
        return generate_mnemonic_password(req.prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Password Generator Error: {e}")


@app.get("/api/llm/status")
def llm_status():
    try:
        return get_llm_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/unload")
def llm_unload():
    try:
        return {"status": "success", "unloaded": unload_llm()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/llm/preload")
def llm_preload():
    try:
        return {"status": "success" if preload_llm() else "error"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------
# Vault Key-Store routes
# ---------------------------------------------------------------------------
@app.post("/api/vault/challenge")
def issue_challenge(req: ChallengeRequest):
    """Issue a time-bound UUID challenge for vault operations."""
    return generate_challenge(req.user_name)


@app.post("/api/vault/secrets")
def store_secret(req: StoreSecretRequest):
    """Encrypt and store a new secret in the vault."""
    if not validate_challenge(req.challenge_id, req.user_name):
        raise HTTPException(status_code=403, detail="Challenge expired or invalid.")
    if not req.label.strip() or not req.plaintext.strip():
        raise HTTPException(status_code=400, detail="Label and value cannot be empty.")
    encrypted = encrypt_secret(req.plaintext)
    save_secret(user_name=req.user_name, label=req.label.strip(),
                encrypted_value=encrypted["ciphertext"], nonce=encrypted["nonce"], tag=encrypted["tag"])
    log_session(req.user_name, f"Secret Stored: {req.label.strip()}", 100.0, True)
    return {"status": "success", "message": "Secret encrypted and stored."}


@app.post("/api/vault/unlock")
def unlock_vault(req: UnlockVaultRequest):
    """Decrypt all secrets for a verified user."""
    if not validate_challenge(req.challenge_id, req.user_name):
        raise HTTPException(status_code=403, detail="Challenge expired or invalid.")
    encrypted_secrets = get_user_secrets(req.user_name)
    decrypted = []
    for s in encrypted_secrets:
        try:
            value = decrypt_secret(s["nonce"], s["encrypted_value"], s["tag"])
        except Exception:
            value = "[DECRYPTION_ERROR]"
        decrypted.append({"id": s["id"], "label": s["label"], "value": value, "created_at": s["created_at"]})
    log_session(req.user_name, "Vault Unlocked", 100.0, True)
    return {"status": "success", "secrets": decrypted}


@app.delete("/api/vault/secrets/{secret_id}")
def remove_secret(secret_id: int, user_name: str):
    """Delete a secret from the vault."""
    if not delete_secret(secret_id, user_name):
        raise HTTPException(status_code=404, detail="Secret not found or access denied.")
    log_session(user_name, f"Secret Deleted (ID: {secret_id})", 100.0, True)
    return {"status": "success", "message": "Secret permanently destroyed."}


# ---------------------------------------------------------------------------
# Serve frontend static files
# ---------------------------------------------------------------------------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

static_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.exists(static_path):
    app.mount("/", StaticFiles(directory=static_path, html=True), name="static")

    # Catch-all route to support client-side routing
    @app.get("/{catchall:path}")
    async def read_index(catchall: str):
        if catchall.startswith("api"):
            raise HTTPException(status_code=404, detail="Not Found")
        return FileResponse(os.path.join(static_path, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
