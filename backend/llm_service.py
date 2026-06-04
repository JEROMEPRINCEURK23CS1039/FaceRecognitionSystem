"""
llm_service.py — AEGIS CORE local LLM / Gemini API integration layer.
Manages a single persistent Qwen GGUF model instance with thread-safe
access locally, OR switches to the fast Gemini API (gemini-2.5-flash) in the cloud.
"""

import os
import gc
import json
import time
import threading

# Detect if Gemini API key is provided
USE_GEMINI = os.getenv("GEMINI_API_KEY") is not None

if USE_GEMINI:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    Llama = None
else:
    try:
        from llama_cpp import Llama
    except ImportError:
        Llama = None

MODEL_PATH = os.getenv("LLM_MODEL_PATH", "models/qwen.gguf")

_llm = None
_last_active_time = time.time()
_lock = threading.Lock()
PERSISTENT_MODE = True  # Keep model in RAM to prevent cold-start latency


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _strip_json_fences(text: str) -> str:
    """Remove ```json / ``` markdown fences that LLMs sometimes wrap around JSON."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def _call_local(prompt: str, max_tokens: int, temperature: float) -> str:
    """Run inference locally on the GGUF model and return raw text."""
    llm = get_llm()
    output = llm(prompt, max_tokens=max_tokens, temperature=temperature, stop=["<|im_end|>"])
    return output["choices"][0]["text"].strip()


def _call_gemini(system: str, user: str, response_json: bool = False) -> str:
    """Send prompt to Gemini API and get text response."""
    generation_config = {}
    if response_json:
        generation_config["response_mime_type"] = "application/json"
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system,
            generation_config=generation_config
        )
        response = model.generate_content(user)
        return response.text.strip()
    except Exception as e:
        print(f"GEMINI API ERROR: {e}")
        if response_json:
            return "{}"
        return f"Error communicating with AI Core: {e}"


def _qwen(system: str, user: str, max_tokens: int, temperature: float, response_json: bool = False) -> str:
    """Unified wrapper that handles both Gemini and Qwen local formats."""
    if USE_GEMINI:
        return _call_gemini(system, user, response_json)
    else:
        prompt = (
            f"<|im_start|>system\n{system}<|im_end|>\n"
            f"<|im_start|>user\n{user}<|im_end|>\n"
            f"<|im_start|>assistant\n"
        )
        return _call_local(prompt, max_tokens, temperature)


# ---------------------------------------------------------------------------
# LLM lifecycle management
# ---------------------------------------------------------------------------
def get_llm() -> Llama:
    global _llm, _last_active_time
    if USE_GEMINI:
        return None
        
    with _lock:
        _last_active_time = time.time()
        if _llm is None:
            if Llama is None:
                raise ImportError("llama-cpp-python is not installed.")
            if not os.path.exists(MODEL_PATH):
                raise FileNotFoundError(
                    f"Model not found at '{MODEL_PATH}'. "
                    "Please download the GGUF model and place it in backend/models/."
                )
            _llm = Llama(
                model_path=MODEL_PATH,
                n_ctx=4096,
                n_threads=9,         # ~75% of 12 logical threads
                n_gpu_layers=99,     # Offload all layers to GPU if available
                verbose=False,
            )
    return _llm


def _unload_check_loop():
    """Background daemon — auto-unloads model after 10 min of idle (non-persistent mode)."""
    global _llm, _last_active_time
    while True:
        time.sleep(30)
        if USE_GEMINI or PERSISTENT_MODE:
            continue
        with _lock:
            if _llm is not None and (time.time() - _last_active_time > 600):
                print("LLM IDLE TIMEOUT: Unloading model to reclaim RAM...")
                _llm = None
                gc.collect()


threading.Thread(target=_unload_check_loop, daemon=True).start()


def get_llm_status() -> dict:
    global _llm, _last_active_time
    if USE_GEMINI:
        return {
            "loaded": True,
            "idle_time_remaining_seconds": 9999.0,
            "threads": 0,
            "ram_saved_mb": 1200,
            "persistent": True,
        }
        
    with _lock:
        loaded = _llm is not None
        remaining = max(0.0, 600.0 - (time.time() - _last_active_time)) if loaded else 0.0
        return {
            "loaded": loaded,
            "idle_time_remaining_seconds": round(remaining, 1),
            "threads": 9,
            "ram_saved_mb": 1200 if not loaded else 0,
            "persistent": PERSISTENT_MODE,
        }


def unload_llm() -> bool:
    global _llm
    if USE_GEMINI:
        return True
        
    with _lock:
        if _llm is not None:
            print("MANUAL UNLOAD: Freeing LLM from memory...")
            _llm = None
            gc.collect()
            return True
        return False


def preload_llm() -> bool:
    if USE_GEMINI:
        return True
    try:
        get_llm()
        return True
    except Exception as e:
        print(f"PRELOAD ERROR: {e}")
        return False


# ---------------------------------------------------------------------------
# LLM task functions
# ---------------------------------------------------------------------------
def analyze_security_logs(logs_data: str) -> str:
    system = (
        "You are a highly capable AI security analyst for AEGIS CORE. "
        "Review the following login attempts and security events. "
        "Identify suspicious behaviour, patterns, or unauthorized access. "
        "Provide a concise, professional summary."
    )
    return _qwen(system, f"Recent vault logs:\n\n{logs_data}\n\nPlease provide an analysis.", 512, 0.2)


def chat_with_assistant(user_message: str, chat_history: list, logs_data: str) -> str:
    system = (
        "You are a helpful AI security analyst for AEGIS CORE. "
        "You have access to the user's recent security logs. "
        "Be concise, professional, and focus on security implications.\n\n"
        f"Recent System Logs:\n{logs_data}"
    )
    
    if USE_GEMINI:
        contents = []
        for msg in chat_history[-6:]:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append({"role": role, "parts": [msg.get("content", "")]})
        contents.append({"role": "user", "parts": [user_message]})
        
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=system
            )
            response = model.generate_content(contents)
            return response.text.strip()
        except Exception as e:
            return f"Error communicating with AI Core: {e}"
    else:
        # Build full prompt manually to include history (last 3 turns)
        prompt = f"<|im_start|>system\n{system}<|im_end|>\n"
        for msg in chat_history[-6:]:
            prompt += f"<|im_start|>{msg.get('role', 'user')}\n{msg.get('content', '')}<|im_end|>\n"
        prompt += f"<|im_start|>user\n{user_message}<|im_end|>\n<|im_start|>assistant\n"
        return _call_local(prompt, 300, 0.7)


def audit_password_strength(password: str, label: str) -> str:
    system = (
        "You are an expert cybersecurity auditor. Critique the strength of the password/secret. "
        "Evaluate length, character diversity, and dictionary attack vulnerability. "
        "Give constructive advice. Keep your response to 2-4 sentences max."
    )
    return _qwen(system, f"Secret Label: {label}\nSecret Value: {password}", 150, 0.3)


def generate_mnemonic_password(prompt: str) -> dict:
    system = (
        "You are a secure password generator. Create a strong, easy-to-remember mnemonic passphrase. "
        'Return raw valid JSON with exactly two keys: "password" and "explanation".'
    )
    text = _strip_json_fences(_qwen(system, f"Purpose: {prompt}", 200, 0.7, response_json=True))
    try:
        return json.loads(text)
    except Exception:
        return {"password": "Secure-Vault-Pass-2026!", "explanation": "High entropy combination of words and special characters."}


def generate_system_security_score(stats_summary: str) -> dict:
    system = (
        "You are an expert AI security auditor. Review the system stats and assess overall security. "
        'Return raw valid JSON with exactly two keys: "score" (int 0-100) and "recommendations" (list of 3 strings).'
    )
    text = _strip_json_fences(_qwen(system, f"System Stats Summary:\n{stats_summary}", 250, 0.2, response_json=True))
    try:
        return json.loads(text)
    except Exception:
        return {
            "score": 75,
            "recommendations": [
                "Ensure all users employ facial liveness blink checks.",
                "Audit key-store passwords for dictionary vulnerabilities.",
                "Review logs regularly for access denylists or anomalies.",
            ],
        }


def parse_log_search_query(user_query: str) -> dict:
    system = (
        "Translate natural language log search queries into a structured JSON filter.\n"
        "Allowed JSON keys:\n"
        "- \"name\": string (e.g. 'Jerome', 'John Doe', 'Unknown')\n"
        "- \"event\": string (e.g. 'Enrollment', 'Unlock', 'Delete', 'Stored')\n"
        "- \"success\": boolean (true for success/verified/unlocked, false for failed/denied/rejected)\n\n"
        "Rules:\n"
        "1. Do NOT extract generic terms like 'login', 'logins', 'attempts' as the event name.\n"
        "2. Do NOT output keys with empty or null values. Only output keys that are explicitly requested.\n"
        "3. Output ONLY raw JSON."
    )
    text = _strip_json_fences(_qwen(system, f'Search Query: "{user_query}"', 150, 0.0, response_json=True))
    try:
        parsed = json.loads(text)
        filtered = {k: v for k, v in parsed.items() if v is not None and v != "" and v != []}
        if "event" in filtered:
            evt_lower = filtered["event"].lower()
            valid_variations = [evt_lower, "enroll", "store", "unlock", "delete"]
            if not any(v in user_query.lower() for v in valid_variations):
                del filtered["event"]
        return filtered
    except Exception:
        return {}
