# web_api.py
import os
import logging
logger = logging.getLogger(__name__)
import tempfile
import threading
import time
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi import HTTPException
import asyncio
import json

# reuse your existing code
from ai_chat import AiChat
from tools import TOOL_SYSTEM_PROMPT, speech_to_text

# For PDFs in file upload
try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None

app = FastAPI()

# allow browser frontend to call the API (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session store: dict[session_id] = AiChat instance
SESSIONS: dict[str, AiChat] = {}
SESSIONS_LOCK = threading.Lock()
SESSION_TTL_SECONDS = 3600  # 1 hour

def get_chat_session(session_id: str) -> AiChat:
    """Gets or creates an AiChat session for the given ID."""
    with SESSIONS_LOCK:
        if session_id not in SESSIONS:
            logger.info(f"Creating new session: {session_id}")
            SESSIONS[session_id] = AiChat(system_prompt=TOOL_SYSTEM_PROMPT)
        return SESSIONS[session_id]

def cleanup_sessions_loop():
    """Background thread to remove inactive sessions."""
    while True:
        time.sleep(600)  # check every 10 mins
        now = time.time()
        with SESSIONS_LOCK:
            to_delete = [
                sid for sid, chat_obj in SESSIONS.items()
                if now - chat_obj.updated_at > SESSION_TTL_SECONDS
            ]
            for sid in to_delete:
                logger.info(f"Cleaning up inactive session: {sid}")
                del SESSIONS[sid]

# Start cleanup thread
threading.Thread(target=cleanup_sessions_loop, daemon=True).start()


def extract_text_from_upload(file_path: str, filename: str, max_chars: int = 12000, max_pages: int = 3) -> str:
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        if PdfReader is None:
            return "Error: PDF support not available (install pypdf)."
        try:
            reader = PdfReader(file_path)
            pages = min(len(reader.pages), max_pages)
            parts = []
            for i in range(pages):
                parts.append(f"\n--- Page {i+1} ---\n{reader.pages[i].extract_text() or ''}")
            text = "\n".join(parts).strip()
            if not text:
                return "Error: Could not extract text from this PDF (it may be scanned images)."
            return text[:max_chars] + ("\n\n[Truncated]" if len(text) > max_chars else "")
        except Exception as e:
            return f"Error reading PDF: {e}"

    # fallback: treat as text
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            data = f.read(max_chars + 1)
        if len(data) > max_chars:
            data = data[:max_chars] + "\n\n[Truncated]"
        return data
    except Exception as e:
        return f"Error reading file: {e}"


@app.post("/api/chat")
async def api_chat(
    message: str = Form(...),
    session_id: str = Form("default_user"),
    email: str = Form(None),
    password: str = Form(None),
):
    chat_session = get_chat_session(session_id)
    def safe_ask():    
        with chat_session.lock:
            return chat_session.ask(message, email=email, password=password)
    reply = await asyncio.to_thread(safe_ask)
    return reply


@app.post("/api/chat/stream")
async def api_chat_stream(
    message: str = Form(...),
    session_id: str = Form("default_user"),
    email: str = Form(None),
    password: str = Form(None),
):
    chat_session = get_chat_session(session_id)
    event_queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def on_event(event_type: str, data):
        """Called from the worker thread; safely puts an event into the asyncio queue."""
        asyncio.run_coroutine_threadsafe(
            event_queue.put({"type": event_type, "data": data}),
            loop,
        )

    def run_ask():
        with chat_session.lock:
            result = chat_session.ask(message, email=email, password=password, on_event=on_event)
        # Signal completion
        asyncio.run_coroutine_threadsafe(
            event_queue.put({"type": "done", "data": result}),
            loop,
        )

    # Start ask() in a background thread
    threading.Thread(target=run_ask, daemon=True).start()

    async def generate():
        while True:
            event = await event_queue.get()
            yield f"data: {json.dumps(event)}\n\n"
            if event["type"] == "done":
                break

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        },
    )


@app.post("/api/voice")
async def api_voice(
    audio: UploadFile = File(...),
    session_id: str = Form("default_user")
):
    """
    Upload audio (wav/mp3/m4a) -> whisper -> chat (tools allowed).
    """
    suffix = os.path.splitext(audio.filename)[1].lower() or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        tmp.write(await audio.read())

    try:
        text = speech_to_text(tmp_path)
        if text.startswith("Error"):
            return {"error": text}

        chat_session = get_chat_session(session_id)
        reply = chat_session.ask(text)
        return {"transcript": text, "reply": reply}
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass

#___________________________________________Read_file-------------------------------------------------------------
@app.post("/api/file")
async def api_file(
    instruction: str = Form(...),
    file: UploadFile = File(...),
    session_id: str = Form("default_user")
):
    """
    Upload file + instruction -> extract text -> chat.ask (tools allowed).
    """
    suffix = os.path.splitext(file.filename)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        tmp.write(await file.read())

    try:
        content = extract_text_from_upload(tmp_path, file.filename, max_chars=12000, max_pages=3)

        out_name = os.path.splitext(os.path.basename(file.filename))[0] + ".pdf"

        prompt = (
            f"USER REQUEST: {instruction}\n\n"
            f"ORIGINAL FILENAME: {file.filename}\n"
            f"SUGGESTED OUTPUT AS: {out_name}\n\n"
            "FILE CONTENT (preview, may be truncated):\n"
            f"{content}\n\n"
            "If the user wants me to process this file and save or email the result, I should use the appropriate tools."
        )

        chat_session = get_chat_session(session_id)
        reply = chat_session.ask(prompt)

        return reply
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
#--------------------------------------------------------write_file------------------------------------------------------ 
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SAFE_WRITE_DIR = os.path.join(BASE_DIR, "written_files")

@app.get("/api/download/{filename}")
def download_file(filename: str):
    filename = os.path.basename(filename)  # prevent ../ trick
    path = os.path.join(SAFE_WRITE_DIR, filename)

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path, filename=filename)      

#--------------------------------------------------------Changing_Model------------------------------------------------------ 
import config

@app.get("/api/model")
def get_model():
    return {"model": config.CURRENT_MODEL}

@app.post("/api/model")
async def set_model(model: str = Form(...)):
    config.CURRENT_MODEL = model
    return {"ok": True, "model": config.CURRENT_MODEL}
              
        
        
@app.get("/api/health")
def health():
    return {"ok": True}