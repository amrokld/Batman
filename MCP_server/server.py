import logging
import os
import sys
import threading
import time
import subprocess
import webbrowser

from mcp.server.fastmcp import FastMCP
from ai_chat import start_chat 


import uvicorn
from web_api import app



logging.basicConfig(
    level=logging.ERROR,   # only show errors, no INFO spam
    format="%(levelname)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stderr)]
)

# --- Force Silence Uvicorn ---
class EndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        # Ignore any log that contains "GET /api/health"
        return record.getMessage().find("/api/health") == -1

# Apply filter to uvicorn access logs
logging.getLogger("uvicorn.access").addFilter(EndpointFilter())
logging.getLogger("uvicorn.access").propagate = False # Stop it from reaching root logger

# Also set levels to ERROR globally
logging.getLogger("uvicorn").setLevel(logging.ERROR)
logging.getLogger("uvicorn.error").setLevel(logging.ERROR)
logging.getLogger("uvicorn.access").setLevel(logging.ERROR)

logger = logging.getLogger(__name__)


# -------------------------------------------------
# MCP Server Setup
# -------------------------------------------------
PORT = int(os.environ.get("PORT", 8080))
mcp = FastMCP("demo-mcp-server", port=PORT)


    

    
# -------------------------------------------------
# Helper: start MCP server in a thread
# -------------------------------------------------
def start_mcp_server():
    logger.info(f"Starting MCP Server on port {PORT}...")
    try:
        mcp.run(transport="sse")
    except Exception as e:
        logger.error(f"Server error: {e}")
    finally:
        logger.info("MCP Server terminated.")
        

# Global reference so we can kill it on shutdown
_frontend_proc = None

def start_frontend():
    """Starts the React frontend (AI_Chatbot) in a separate process."""
    global _frontend_proc
    frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "AI_Chatbot"))
    print(f"🚀 Starting Frontend in {frontend_path}...")
    try:
        # shell=False + npm.cmd avoids the "Terminate batch job (Y/N)?" prompt on Windows
        _frontend_proc = subprocess.Popen(
            ["npm.cmd", "run", "dev"],
            cwd=frontend_path,
            shell=False,
        )
        # Give it a few seconds to start before opening the browser
        time.sleep(3)
        print("🌍 Opening AI Chatbot in browser...")
        webbrowser.open("http://localhost:5173")
    except Exception as e:
        print(f"❌ Failed to start frontend: {e}")


# -------------------------------------------------
# Main
# -------------------------------------------------
if __name__ == "__main__":
        
    def start_web_api():
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=8000, 
            log_level="error",     # Only show errors
            access_log=False       # Disable access logs
        )
             
    # 1) start MCP server in background thread
    server_thread = threading.Thread(target=start_mcp_server, daemon=True)
    server_thread.start()
    
    web_thread = threading.Thread(target=start_web_api, daemon=True)
    web_thread.start()
    print("✅ Web API running on http://0.0.0.0:8000 (accessible on LAN)")
    
    # 2) start Frontend
    start_frontend()
    
    time.sleep(0.5)
    print()

    try:
        start_chat()
    except KeyboardInterrupt:
        pass
    finally:
        # Kill the Vite frontend process cleanly (no "Terminate batch job?" prompt)
        if _frontend_proc and _frontend_proc.poll() is None:
            _frontend_proc.terminate()
        print("\n👋 Server stopped.")