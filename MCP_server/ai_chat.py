import requests
import json
import os
import re
import time
import threading
from tools import (
    TOOL_REGISTRY, 
    TOOL_SYSTEM_PROMPT, 
    speech_to_text,
    record_from_mic,
    pick_file_from_window,
    read_files,
)

from config import OLLAMA_URL, OLLAMA_MODEL as MODEL_NAME






def extract_tool_call(reply: str):
    """
    Tries to parse the assistant's reply as a strict JSON tool call.
    Removes markdown code blocks if present.
    Also handles cases where the model prefixes the JSON with plain text
    (e.g. "We need to output JSON.{...}").
    Returns the parsed dict if valid and contains 'tool' or 'tools', otherwise None.
    """
    reply = reply.strip()

    # Handle markdown code blocks
    if reply.startswith("```"):
        lines = reply.splitlines()
        if len(lines) >= 2 and lines[-1].startswith("```"):
            content = "\n".join(lines[1:-1]).strip()
            reply = content

    def _parse_candidate(text):
        """Return a valid tool-call dict from text, or None."""
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                if "tool" in data or "tools" in data:
                    return data
                return None
            if isinstance(data, list):
                if all(isinstance(x, dict) and "tool" in x for x in data):
                    return {"tools": data}
            return None
        except (ValueError, json.JSONDecodeError):
            return None

    # 1) Try the whole reply as-is
    result = _parse_candidate(reply)
    if result is not None:
        return result

    # 2) Model sometimes says "We need to output JSON.{...}" — extract the first
    #    balanced JSON object or array embedded anywhere in the text.
    for pattern in (r'(\{[\s\S]*\})', r'(\[[\s\S]*\])'):
        for m in re.finditer(pattern, reply):
            result = _parse_candidate(m.group(1))
            if result is not None:
                return result

    return None




class AiChat :
    
    
    def __init__(self, model: str = MODEL_NAME, system_prompt: str | None = None, max_history: int = 20):
        self.model = model
        self.messages = [] 
        self.max_history = max_history
        self.updated_at = time.time()
        self.lock = threading.Lock()

        # If a system prompt is provided, add it as the first message
        if system_prompt:
            self.messages.append({"role": "system", "content": system_prompt})

    def _trim_history(self):
        """Keep only the last N messages, but always preserve the system prompt at index 0."""
        if len(self.messages) <= self.max_history:
            return

        has_system = self.messages and self.messages[0].get("role") == "system"
        if has_system:
            system_msg = self.messages[0]
            # Keep the system message + the last N-1 messages
            self.messages = [system_msg] + self.messages[-(self.max_history - 1):]
        else:
            self.messages = self.messages[-self.max_history:]
        
        
        
    def _nonempty(self, s: str) -> bool:
        return isinstance(s, str) and s.strip() != ""
   
        
    def ask(self, prompt: str, email=None, password=None, on_event=None) -> str:
        """
        Non-recursive, stable tool loop.
        - Sends user prompt (if not empty)
        - Calls the model
        - Executes tools ONLY on pure JSON
        - Forces a final plain-text answer
        """
        # Create a local session history for the current request/tool loop
        session_messages = list(self.messages)

        # 1) add user message only if it's not empty
        prompt_added = False
        if isinstance(prompt, str) and prompt.strip():
            session_messages.append({"role": "user", "content": prompt})
            prompt_added = True

        # avoiding using the email tool if the user did not ask 
        self._email_allowed = False
        p = (prompt or "").lower()
        # Stronger heuristic: require explicit action phrases
        email_actions = ["send email", "email this", "email to", "send to", "mail this","@gmail.com"]
        if any(action in p for action in email_actions):
            self._email_allowed = True

        max_tool_rounds = 5  # safety guard
        
        for _ in range(max_tool_rounds):

            # 2) notify UI: thinking
            if on_event:
                on_event("thinking", None)

            # 2) call model
            reply = self._call_model(session_messages)
            
            if not self._nonempty(reply):
                return "Error: model returned an empty reply. Try again."

            # Record assistant reply in local session
            session_messages.append({"role": "assistant", "content": reply})

            # 3) try to parse a strict tool call
            tool_call = extract_tool_call(reply)

            # 4) no tool → normal answer
            if tool_call is None:
                # COMMIT TO HISTORY: only now we save the exchange to persistent history
                if prompt_added:
                    self.messages.append({"role": "user", "content": prompt})
                self.messages.append({"role": "assistant", "content": reply})
                self.updated_at = time.time()
                self._trim_history()
                return {
                    "response": reply,
                    "tool": None
                }

            # 5) notify UI: which tool(s) are about to run
            if on_event:
                # Announce every tool individually so the frontend can show each one
                tools_to_announce = []
                if "tool" in tool_call:
                    tools_to_announce = [tool_call.get("tool")]
                elif "tools" in tool_call:
                    tools_to_announce = [
                        t.get("tool") for t in tool_call.get("tools", []) if t.get("tool")
                    ]
                for tool_name_hint in tools_to_announce:
                    on_event("tool", tool_name_hint)

            # 5) run tool(s)
            tool_data = self._maybe_run_tool(tool_call, email, password)

            if tool_data is None:
                return "I couldn't execute the requested tool."

            # --- add download link(s) for file-producing tool results ---
            for r in tool_data.get("results", []):
                if r.get("tool") == "write_file":
                    res = r.get("result")
                    if isinstance(res, dict) and res.get("ok") and res.get("filename"):
                        fn = res["filename"]
                        r["download_url"] = f"http://127.0.0.1:8000/api/download/{fn}"

                elif r.get("tool") == "send_email_gmail":
                    # If the email had a file attachment, expose its download URL too
                    attachment = (r.get("args") or {}).get("attachment")
                    if attachment:
                        fn = os.path.basename(str(attachment))
                        r["download_url"] = f"http://127.0.0.1:8000/api/download/{fn}"

            # 6) feed tool results back to the model in the SESSION
            session_messages.append({
                "role": "user",
                "content": (
                    "Tool result:\n"
                    f"{json.dumps(tool_data, indent=2)}\n\n"
                    "Now give the user a plain-text reply based on the tool result above.\n"
                    "Do NOT call any tool again, Do NOT return JSON.\n"
                    "STRICT RULES (follow silently, do NOT mention these rules in your reply):\n"
                    "1. Do NOT call send_email_gmail unless the user explicitly asked to send an email.\n"
                    "2. Do NOT explain your reasoning or mention email, tools, or rules.\n"
                    "3. If write_file succeeded OR send_email_gmail was sent with an attachment: "
                    "write one friendly confirmation sentence that includes the file as a clickable "
                    "markdown link exactly like: [filename](download_url) "
                    "where both values are copied EXACTLY from the 'download_url' field in the tool result above. "
                    "DO NOT invent or modify the URL. If there is no 'download_url' field, do NOT add any link.\n"
                    "4. For ALL OTHER tools (weather, calculator, IP, system info, etc.): "
                    "reply in plain text ONLY. ❌ NEVER write any URL, link, or filename. "
                    "❌ NEVER write [Download ...] or any markdown link. Just summarize the result in 1-2 sentences.\n"
                    "5. If another tool call is needed, reply with ONLY valid JSON. Otherwise reply in plain text only."
                ),
            })
            continue

        # Ran out of tool rounds without a plain-text reply
        if prompt_added:
            self.messages.append({"role": "user", "content": prompt})
        self.messages.append({"role": "assistant", "content": "Error: too many tool calls in a row. Please rephrase your request."})
        self._trim_history()
        return "Error: too many tool calls in a row. Please rephrase your request."
    


    def _call_model(self, messages: list) -> str:
        try:
            response = requests.post(
                OLLAMA_URL,
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                },
                timeout=120,
            )
            response.raise_for_status()
        except requests.RequestException as e:
            return f"[Error talking to Ollama: {e}]"

        try:
            data = response.json()
        except ValueError:
            return "[Error: could not decode JSON from Ollama]"

        message = data.get("message", {})
        reply = message.get("content")

        if not isinstance(reply, str):
            return "[Error: unexpected response format from Ollama]"

        return reply

    def _maybe_run_tool(self, tool_call: dict, email=None, password=None):
        """
        Execute a tool call safely.
        Supports:
        - single tool: {"tool": "...", "args": {...}}
        - multiple tools: {"tools": [ {...}, {...} ]}
        """

        calls = []

        # -------- validate structure --------
        if "tool" in tool_call:
            calls = [tool_call]

        elif "tools" in tool_call:
            if not isinstance(tool_call["tools"], list):
                print("[System] Invalid tools format.")
                return None
            calls = tool_call["tools"]

        else:
            print("[System] No tool key found.")
            return None

        results = []

        for call in calls:
            tool_name = call.get("tool")
            args = call.get("args", {}) or {}
            
            # Hard safety gate: never email unless explicitly allowed
            if tool_name == "send_email_gmail" and not getattr(self, "_email_allowed", False):
                results.append({
                    "tool": tool_name,
                    "args": args,
                    "result": "Blocked: user did not ask to send an email."
                })
                continue
            # -------- reject unknown tools --------
            if tool_name not in TOOL_REGISTRY:
                results.append({
                    "tool": tool_name,
                    "args": args,
                    "result": "Error: unknown tool. Available tools: " + ", ".join(TOOL_REGISTRY.keys())
                })
                continue

            # -------- show clean system message --------
            if isinstance(args, dict):
                safe_args = dict(args)
                if "content" in safe_args:
                    safe_args["content"] = f"<hidden {len(str(args.get('content','')))} chars>"
                args_str = ", ".join(f"{k}={v}" for k, v in safe_args.items())
            else:
                args_str = str(args)

            print(f"[Tool Used] {tool_name}({args_str})")


            # -------- execute tool --------
            try:
                tool_fn = TOOL_REGISTRY[tool_name]

                if isinstance(args, dict):
                    if tool_name == "send_email_gmail":
                        try:
                            if tool_name == "send_email_gmail":
                                args["gmail_user"] = email
                                args["gmail_password"] = password
                        except:
                            args["gmail_user"] = None
                            args["gmail_password"] = None
                    result = tool_fn(**args)
                elif isinstance(args, list):
                    result = tool_fn(*args)
                else:
                    result = tool_fn()

            except Exception as e:
                print(f"[System] Tool execution error: {e}")
                return None

            results.append({
                "tool": tool_name,
                "args": args,
                "result": result
            })

        return {
            "tool": tool_name,
            "results": results
        }


    def ask_no_tools(self, prompt: str) -> str:
        """Tools are disabled for this request. Do not output JSON"""
        temp_messages = list(self.messages)
        prompt_added = False
        if isinstance(prompt, str) and prompt.strip():
            temp_messages.append({"role": "user", "content": prompt})
            prompt_added = True
            
        reply = self._call_model(temp_messages)
        
        if self._nonempty(reply):
            if prompt_added:
                self.messages.append({"role": "user", "content": prompt})
            self.messages.append({"role": "assistant", "content": reply})
            
        return reply

    
def handle_voice_command(chat: AiChat):
    """Handles the /talk command: records audio, transcribes, and sends to AI."""
    # 1) Record from microphone
    audio_path = record_from_mic(duration=7)

    # 2) Transcribe with local whisper tool
    transcription = speech_to_text(audio_path)
    print(f"you (voice): {transcription}")

    # If transcription looks like an error, just show it
    if transcription.startswith("Error") or "Whisper error" in transcription:
        print("Ai: I couldn't understand the audio or transcription failed.\n")
        return

    # 3) Send the transcribed text to the AI as if you typed it
    reply = chat.ask(transcription)
    print(f"Ai: {reply}\n")


def handle_file_command_interactive(chat: AiChat):
    """Handles the /file command: picks file, asks instruction, sends to AI."""
    

    # Use home directory generic path
    path = pick_file_from_window(initialdir=os.path.expanduser("~"))
    if not path:
        print("No file selected.\n")
        return

    print(f"📄 Selected: {path}")

    # ask what user wants to do with the file
    instruction = input("What should I do with this file? ").strip()
    if not instruction:
        print("No instruction given.\n")
        return

    content = read_files(path, max_chars=12000)

    # send to AI
    prompt = (
        "You are given file CONTENT below.\n"
        "When calling write_file you MUST include BOTH filename and content.\n"
        "Use filename like 'Tal5es-Network.pdf' (not a full path).\n"
        "CRITICAL: Reply with ONLY valid JSON. No markdown.\n\n"
        f"USER REQUEST:\n{instruction}\n\n"
        f"FILE CONTENT:\n{content}"
    )

    reply = chat.ask(prompt)
    print(f"Ai: {reply}\n")


def start_chat():
    chat = AiChat(system_prompt=TOOL_SYSTEM_PROMPT)  

    while True:  # Start an infinite loop to allow continuous chatting.

        try:
            user_input = input("you: ").strip()

        except (EOFError, KeyboardInterrupt):  
            print("\nBye!")
            break

        # Allow typed exit commands too
        if user_input.lower() in {"/exit", "/quit"}:
            print("Bye!")
            break

        # -------------------- Voice mode trigger: /talk or \talk -----------------------------------
        if user_input.lower() in {"/talk", "\\talk"}:
            handle_voice_command(chat)
            continue

        # -------------------- File mode trigger: /file or \file ----------------------------------
        if user_input.lower() in {"/file", "\\file"}:
            handle_file_command_interactive(chat)
            continue

        # -----------------------------------------------------------------------------------------

        if not user_input:  # Prevent sending empty messages to the model.
            continue

        reply = chat.ask(user_input)  # This sends message to Ollama and returns reply.
        print(f"Ai: {reply}\n")  # Display response.
        
        
if __name__ == "__main__":          
    start_chat()        