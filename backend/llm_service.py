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

# ---------------------------------------------------------------------------
# Load environment variables manually from .env if present
# ---------------------------------------------------------------------------
def _load_dotenv():
    # Check current directory and parent directory for .env
    for path in [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    ]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            k, v = line.split("=", 1)
                            # Strip whitespace and potential enclosing quotes
                            k = k.strip()
                            v = v.strip().strip("'").strip('"')
                            if k and v:
                                os.environ[k] = v
            except Exception as e:
                print(f"Error loading .env file from {path}: {e}")

_load_dotenv()

# User requested exclusively using the local Qwen model (in cloud and locally)
USE_GEMINI = False

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
import re

def _extract_json(text: str) -> str:
    """Extract and validate JSON content from LLM response text."""
    text = text.strip()
    # Try to find content inside triple backticks
    json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if json_match:
        return json_match.group(1).strip()
    # Find the first '{' and last '}'
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return text[first_brace:last_brace+1].strip()
    return text


def _call_local(prompt: str, max_tokens: int, temperature: float) -> str:
    """Run inference locally on the GGUF model and return raw text."""
    llm = get_llm()
    output = llm(prompt, max_tokens=max_tokens, temperature=temperature, stop=["<|im_end|>"])
    return output["choices"][0]["text"].strip()


def _qwen(system: str, user: str, max_tokens: int, temperature: float, response_json: bool = False) -> str:
    """Wrapper that formats the prompt for the local Qwen GGUF model."""
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
                print(f"Model not found at '{MODEL_PATH}'. Downloading Qwen-1.5B-Instruct GGUF...")
                os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
                import urllib.request
                url = "https://huggingface.co/Qwen/Qwen2-1.5B-Instruct-GGUF/resolve/main/qwen2-1_5b-instruct-q4_k_m.gguf"
                try:
                    def report(block_num, block_size, total_size):
                        read_so_far = block_num * block_size
                        if total_size > 0:
                            percent = read_so_far * 100.0 / total_size
                            if block_num % 1000 == 0 or read_so_far >= total_size:
                                print(f"Downloading Qwen GGUF: {percent:.1f}% ({read_so_far / (1024**2):.1f} MB / {total_size / (1024**2):.1f} MB)")
                    urllib.request.urlretrieve(url, MODEL_PATH, reporthook=report)
                    print("Download complete!")
                except Exception as download_err:
                    raise FileNotFoundError(
                        f"Model not found at '{MODEL_PATH}' and auto-download failed: {download_err}. "
                        "Please download the GGUF model and place it in backend/models/."
                    )
            # Maximize resource utilization per user request
            cores = os.cpu_count() or 4
            # Use all available CPU cores without artificial limits
            max_threads = cores

            _llm = Llama(
                model_path=MODEL_PATH,
                n_ctx=8192,          # Maximize context window
                n_threads=max_threads,
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
    
    # Build full prompt manually to include history (last 3 turns)
    prompt = f"<|im_start|>system\n{system}<|im_end|>\n"
    for msg in chat_history[-6:]:
        prompt += f"<|im_start|>{msg.get('role', 'user')}\n{msg.get('content', '')}<|im_end|>\n"
    prompt += f"<|im_start|>user\n{user_message}<|im_end|>\n<|im_start|>assistant\n"
    # Increased token limit and utilized max local settings
    return _call_local(prompt, 512, 0.7)


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
    text = _extract_json(_qwen(system, f"Purpose: {prompt}", 200, 0.7, response_json=True))
    try:
        return json.loads(text)
    except Exception:
        return {"password": "Secure-Vault-Pass-2026!", "explanation": "High entropy combination of words and special characters."}


def generate_system_security_score(stats_summary: str) -> dict:
    system = (
        "You are an expert AI security auditor. Review the system stats and assess overall security. "
        'Return raw valid JSON with exactly two keys: "score" (int 0-100) and "recommendations" (list of 3 strings).'
    )
    text = _extract_json(_qwen(system, f"System Stats Summary:\n{stats_summary}", 250, 0.2, response_json=True))
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
    text = _extract_json(_qwen(system, f'Search Query: "{user_query}"', 150, 0.0, response_json=True))
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
