# 🦇 Batman — Local AI Chatbot with Tools

**Batman** is a full-stack, locally-hosted AI assistant that combines a sleek React chat interface with a powerful Python backend. It runs on your own machine using [Ollama](https://ollama.com/) and gives the AI real tools it can actually use — no cloud APIs, no subscriptions.

---

## ✨ Features

### 🤖 AI & Tool Use
- **Local LLM via Ollama** — works with any model (Qwen, Mistral, GPT-OSS, and more)
- **Multi-tool execution** — the AI can call multiple tools in a single response or chain them across turns
- **Tool call safety** — email is never sent unless you explicitly ask; no silent proactive actions
- **Conversation history** — per-session memory with automatic trimming after 20 messages

### 🛠️ Built-in Tools
| Tool | Description |
|------|-------------|
| `calculate` | Safe math evaluator (supports trig, sqrt, log, etc.) |
| `get_current_weather` | Real-time weather by city via wttr.in |
| `send_email_gmail` | Send emails (with optional file attachment) via Gmail SMTP |
| `write_file` | Create/append `.txt`, `.pdf`, or `.docx` files |
| `system_commands_windows` | Read-only Windows network/system commands (`ipconfig`, `ping`, `netstat`, etc.) |
| `get_public_ip` | Fetch the machine's external IP address |
| `browse_web` | Fetch and summarize any public webpage |
| `speech_to_text` | Transcribe audio files locally using OpenAI Whisper |

### 🖥️ Web Interface (React + Vite)
- **Dark / Light theme** toggle
- **Real-time status indicator** — shows `Thinking...` and `Using: <tool>` while the AI works (via SSE)
- **Multiple conversations** with persistent local storage, auto-titling, and rename/delete support
- **File upload** — attach PDFs or text files for the AI to read and process
- **Voice dictation** — speak your message using the Web Speech API
- **Drag-and-drop** file support
- **Edit & resend** any previous message
- **Copy message** to clipboard
- **API health indicator** — live `Online / Offline` status badge
- **Tool sidebar** — browse available tools and example suggestions
- **Auto-scroll** to the latest message
- **Clickable download links** for AI-generated files

### ⚡ Backend (FastAPI + MCP)
- **FastAPI** REST/SSE backend serving the chat UI
- **MCP (Model Context Protocol)** server running alongside for extensibility
- **Session management** — isolated chat sessions per browser tab with 1-hour TTL and auto-cleanup
- **File download endpoint** — securely serve AI-written files back to the browser
- **One-command launch** — `server.py` starts the MCP server, the FastAPI backend, and the React frontend all at once

---

## 🏗️ Architecture

```
Batman/
├── AI_Chatbot/              # React + Vite frontend
│   └── src/
│       ├── pages/
│       │   └── ChatController.jsx   # All state & logic
│       ├── components/chat/         # UI components
│       │   ├── ChatLayout.jsx
│       │   ├── ChatInput.jsx
│       │   ├── MessageBubble.jsx
│       │   ├── Sidebar.jsx
│       │   ├── Header.jsx
│       │   └── ToolSidebar.jsx
│       ├── api/ChatApi.js           # SSE stream client
│       └── data/tools.js            # Tool metadata & suggestions
│
└── MCP_server/              # Python backend
    ├── server.py            # Entry point — starts everything
    ├── web_api.py           # FastAPI routes (chat, voice, file, download)
    ├── ai_chat.py           # AiChat class — tool loop, history, SSE events
    ├── tools.py             # All tool implementations + system prompt
    ├── config.py            # Ollama URL, model name, Gmail config
    └── requirements.txt
```

---

## 🚀 Getting Started

### Prerequisites
- [Python 3.11+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)
- [Ollama](https://ollama.com/) running locally with at least one model pulled
- [FFmpeg](https://ffmpeg.org/) (required for voice/Whisper support)

### 1. Clone the repository
```bash
git clone https://github.com/amrokld/Batman.git
cd Batman
```

### 2. Set up the Python backend
```bash
cd MCP_server
pip install -r requirements.txt
```

### 3. Configure the model
Edit `MCP_server/config.py` to set your preferred Ollama model:
```python
OLLAMA_MODEL = "qwen2.5:7b"   # or mistral, llama3, etc.
```

### 4. Install frontend dependencies
```bash
cd ../AI_Chatbot
npm install
```

### 5. Run everything
```bash
cd ../MCP_server
python server.py
```

This single command will:
1. Start the **MCP server** on port `8080`
2. Start the **FastAPI backend** on port `8000`
3. Launch the **React frontend** (`npm run dev`) on port `5173`
4. Open the chat UI in your default browser automatically

---

## 📬 Gmail Integration (Optional)

To enable email sending, create a Gmail [App Password](https://support.google.com/accounts/answer/185833) and enter your credentials in the chat settings panel — they are sent only to your local backend and never stored permanently.

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TailwindCSS, Lucide Icons |
| Backend | Python, FastAPI, Uvicorn |
| AI Engine | Ollama (local LLM) |
| Protocol | MCP (Model Context Protocol via `fastmcp`) |
| STT | OpenAI Whisper (local, no API key) |
| PDF | ReportLab (write), pypdf (read) |
| Realtime | Server-Sent Events (SSE) |

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
