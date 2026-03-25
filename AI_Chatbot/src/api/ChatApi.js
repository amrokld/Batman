import { getGmailCredentials } from "../utils/ChatHelpers";

const API_BASE = "http://127.0.0.1:8000";

export async function sendMessage(message, files = [], onEvent = null) {

  // CASE 1: text-only message → use streaming SSE endpoint
  if (!files || files.length === 0) {
    const formData = new FormData();
    const creds = JSON.parse(localStorage.getItem("gmail_credentials") || "{}");
    formData.append("message", message);
    formData.append("email", creds.email || "");
    formData.append("password", creds.password || "");

    const res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Backend chat error");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep last incomplete line

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === "done") {
            finalResult = event.data;
          } else if (onEvent) {
            onEvent(event.type, event.data);
          }
        } catch { /* ignore parse errors */ }
      }
    }

    return {
      response: finalResult?.response ?? "",
      tool: finalResult?.tool ?? null,
      files: finalResult?.files ?? [],
    };
  }

  // CASE 2: message with files
  const form = new FormData();
  const creds = JSON.parse(localStorage.getItem("gmail_credentials") || "{}");
  form.append("instruction", message || "");
  form.append("email", creds.email || "");
  form.append("password", creds.password || "");
  files.forEach((file) => form.append("file", file));

  const res = await fetch(`${API_BASE}/api/file`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error("Backend file upload error");

  const data = await res.json();
  return {
    response: data.response,
    tool: data.tool || null,
    files: data.files || [],
  };
}



