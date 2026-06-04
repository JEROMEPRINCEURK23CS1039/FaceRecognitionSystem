"""
database.py — AEGIS CORE persistent storage layer.
Supports SQLite (local) and PostgreSQL (cloud/Azure).
"""

import os
import json
import sqlite3
from datetime import datetime
from contextlib import contextmanager

# ---------------------------------------------------------------------------
# Database URL resolution
# ---------------------------------------------------------------------------
if "WEBSITE_SITE_NAME" in os.environ:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////home/biometric_vault.db")
else:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///biometric_vault.db")

IS_SQLITE = DATABASE_URL.startswith("sqlite")


@contextmanager
def _get_conn():
    """Context manager that always closes the connection."""
    if IS_SQLITE:
        db_path = DATABASE_URL.replace("sqlite:///", "")
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
    else:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Schema init
# ---------------------------------------------------------------------------
def init_db():
    with _get_conn() as conn:
        cur = conn.cursor()
        if IS_SQLITE:
            cur.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    embedding TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    event TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    liveness INTEGER NOT NULL,
                    timestamp TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS secrets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_name TEXT NOT NULL,
                    label TEXT NOT NULL,
                    encrypted_value TEXT NOT NULL,
                    nonce TEXT NOT NULL,
                    tag TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_name) REFERENCES users(name)
                );
            """)
        else:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    embedding vector(128) NOT NULL,
                    timestamp VARCHAR(255) NOT NULL
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS logs (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    event VARCHAR(255) NOT NULL,
                    confidence REAL NOT NULL,
                    liveness BOOLEAN NOT NULL,
                    timestamp VARCHAR(255) NOT NULL
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS secrets (
                    id SERIAL PRIMARY KEY,
                    user_name VARCHAR(255) NOT NULL,
                    label VARCHAR(255) NOT NULL,
                    encrypted_value TEXT NOT NULL,
                    nonce TEXT NOT NULL,
                    tag TEXT NOT NULL,
                    created_at VARCHAR(255) NOT NULL,
                    FOREIGN KEY (user_name) REFERENCES users(name)
                );
            """)


# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------
def _ph():
    """Return the correct SQL placeholder for the active backend."""
    return "?" if IS_SQLITE else "%s"


def save_user(name: str, embedding: list) -> bool:
    try:
        with _get_conn() as conn:
            p = _ph()
            emb = json.dumps(embedding) if IS_SQLITE else embedding
            conn.cursor().execute(
                f"INSERT INTO users (name, embedding, timestamp) VALUES ({p},{p},{p})",
                (name, emb, datetime.now().isoformat()),
            )
        return True
    except sqlite3.IntegrityError as e:
        print(f"DATABASE INTEGRITY ERROR: User '{name}' might already exist. Details: {e}")
        return False
    except Exception as e:
        print(f"DATABASE ERROR in save_user: {e}")
        return False


def get_all_users() -> list:
    with _get_conn() as conn:
        cur = conn.cursor()
        if IS_SQLITE:
            cur.execute("SELECT name, embedding FROM users")
            return [{"name": r["name"], "embedding": json.loads(r["embedding"])} for r in cur.fetchall()]
        cur.execute("SELECT name, embedding::text FROM users")
        return [{"name": r["name"], "embedding": json.loads(r["embedding"])} for r in cur.fetchall()]


def log_session(name: str, event: str, confidence: float, liveness: bool):
    p = _ph()
    timestamp = datetime.now().strftime("%H:%M:%S")
    liveness_val = 1 if (IS_SQLITE and liveness) else liveness
    with _get_conn() as conn:
        conn.cursor().execute(
            f"INSERT INTO logs (name, event, confidence, liveness, timestamp) VALUES ({p},{p},{p},{p},{p})",
            (name, event, confidence, liveness_val, timestamp),
        )


def get_logs(limit: int = 50) -> list:
    p = _ph()
    with _get_conn() as conn:
        cur = conn.cursor()
        cur.execute(f"SELECT name, event, confidence, liveness, timestamp FROM logs ORDER BY id DESC LIMIT {p}", (limit,))
        rows = cur.fetchall()
    return [
        {
            "name": r["name"],
            "event": r["event"],
            "confidence": r["confidence"],
            "liveness": bool(r["liveness"]),
            "timestamp": r["timestamp"],
        }
        for r in rows
    ]


def get_stats() -> dict:
    with _get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as count FROM users")
        registered = cur.fetchone()["count"]
        cur.execute("SELECT COUNT(*) as count FROM logs")
        logins = cur.fetchone()["count"]
    return {"registered": registered, "logins": logins}


# ---------------------------------------------------------------------------
# Encrypted Secrets CRUD
# ---------------------------------------------------------------------------
def save_secret(user_name: str, label: str, encrypted_value: str, nonce: str, tag: str):
    p = _ph()
    with _get_conn() as conn:
        conn.cursor().execute(
            f"INSERT INTO secrets (user_name, label, encrypted_value, nonce, tag, created_at) VALUES ({p},{p},{p},{p},{p},{p})",
            (user_name, label, encrypted_value, nonce, tag, datetime.now().isoformat()),
        )


def get_user_secrets(user_name: str) -> list:
    p = _ph()
    with _get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, label, encrypted_value, nonce, tag, created_at FROM secrets WHERE user_name = {p} ORDER BY id DESC",
            (user_name,),
        )
        rows = cur.fetchall()
    return [dict(r) for r in rows]


def delete_secret(secret_id: int, user_name: str) -> bool:
    p = _ph()
    with _get_conn() as conn:
        cur = conn.cursor()
        cur.execute(f"DELETE FROM secrets WHERE id = {p} AND user_name = {p}", (secret_id, user_name))
        return cur.rowcount > 0


# Auto-initialize on import
init_db()
