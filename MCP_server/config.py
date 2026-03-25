import os
import platform


# --- Model Configuration ---
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/chat")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "gpt-oss:120b-cloud")  # or "mistral",gpt-oss:120b-cloud , qwen3:8b ,qwen2.5:7b

# --- Tool Configuration (optional defaults, not required anymore) ---
GMAIL_USER = os.environ.get("GMAIL_USER")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")

# FFmpeg path for specialized Windows environments (Microsoft Store Python)
# It is safer not to hard crash if this path doesn't exist, but we keep it available if the user relies on it.
MICROSOFT_FFMPEG_PATH = r"C:\Users\isc\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin"



def setup_ffmpeg_path():
    """Adds local ffmpeg to PATH if it exists (Windows only)."""
    if platform.system() == "Windows" and os.path.exists(MICROSOFT_FFMPEG_PATH):
        if MICROSOFT_FFMPEG_PATH not in os.environ.get("PATH", ""):
            os.environ["PATH"] = MICROSOFT_FFMPEG_PATH + os.pathsep + os.environ.get("PATH", "")