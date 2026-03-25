import { Copy, Pencil, FileDown } from "lucide-react";
import { formatTime, isSameDay, formatDateLabel } from "../../utils/ChatHelpers";

/**
 * Lightweight Markdown renderer.
 * Supports: [text](url) links, **bold**, and newlines.
 */
function renderMarkdown(text) {
  if (!text) return null;

  if (typeof text !== "string") {
    text = text?.response || JSON.stringify(text);
  }

  // Split by newlines first
  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    // Parse inline tokens: **bold** and [text](url)
    const tokens = [];
    // Regex: matches **bold**, [text](url), or bare http(s):// URLs
    const pattern = /(\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s)]+))/g;
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(line)) !== null) {
      // Plain text before this match
      if (match.index > lastIndex) {
        tokens.push(line.slice(lastIndex, match.index));
      }

      if (match[0].startsWith("**")) {
        // Bold
        tokens.push(<strong key={`b-${lineIdx}-${match.index}`}>{match[2]}</strong>);
      } else if (match[3] !== undefined) {
        // Markdown link [text](url)
        const href = match[4];
        const isDownload = href.includes("/api/download/");
        const fileName = isDownload ? href.split("/").pop() : undefined;
        tokens.push(
          <a
            key={`a-${lineIdx}-${match.index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            {...(isDownload ? { download: fileName } : {})}
            style={{ color: "#60a5fa", textDecoration: "none", wordBreak: "break-all" }}
          >
            {match[3]}
          </a>
        );
      } else {
        // Bare URL (match[5])
        const href = match[5];
        const isDownload = href.includes("/api/download/");
        const fileName = isDownload ? href.split("/").pop() : undefined;
        const label = isDownload ? `⬇ ${fileName}` : href;
        tokens.push(
          <a
            key={`u-${lineIdx}-${match.index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            {...(isDownload ? { download: fileName } : {})}
            style={{ color: "#60a5fa", textDecoration: "none", wordBreak: "break-all" }}
          >
            {label}
          </a>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Remaining plain text
    if (lastIndex < line.length) {
      tokens.push(line.slice(lastIndex));
    }

    return (
      <span key={`line-${lineIdx}`}>
        {tokens.length > 0 ? tokens : line}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
}

function MessageBubble({
  msg,
  prevMsg,
  isDark,
  isUser,
  handleCopyMessage,
  copiedMessageId,
  startEditResend,
}) {
  const label =
    msg.role === "user"
      ? "You"
      : msg.role === "assistant"
        ? "AI"
        : msg.role === "system"
          ? "System"
          : "Error";

  const bubbleColors = isDark
    ? isUser
      ? "bg-neutral-700 text-neutral-50"
      : "bg-neutral-800 text-neutral-50"
    : isUser
      ? "bg-[#e5e7eb] text-[#111827]"
      : "bg-[#f3f4f6] border border-[#d1d5db] text-[#111827]";

  const showDateSeparator =
    !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);

  const bubbleWidth = "min-w-[180px] max-w-[92%]";

  const iconBtn =
    "p-1 rounded-md hover:bg-black/10 transition flex items-center justify-center";

  const commonIconClass = isDark
    ? "text-xs text-neutral-300 hover:text-neutral-50"
    : "text-xs text-zinc-500 hover:text-zinc-800";

  return (
    <div className="w-full">

      {/* DATE SEPARATOR */}
      {showDateSeparator && msg.createdAt && (
        <div className="flex justify-center my-2">
          <span
            className={
              "px-3 py-1 rounded-full text-[11px] " +
              (isDark
                ? "bg-neutral-800 text-neutral-200"
                : "bg-[#e5e7eb] text-[#374151]")
            }
          >
            {formatDateLabel(msg.createdAt)}
          </span>
        </div>
      )}

      {/* ================= USER ================= */}
      {msg.role === "user" && (
        <div className="flex justify-end">
          <div className="flex flex-col items-end group">

            {/* USER BUBBLE */}
            <div
              className={
                "inline-block min-w-[180px] max-w-[92%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words " +
                (isDark
                  ? "bg-neutral-800/80 text-neutral-100 backdrop-blur"
                  : "bg-zinc-200 text-zinc-900")
              }
            >
              <span className="block text-[11px] opacity-70 mb-1">
                You
              </span>

              {msg.content && <div>{renderMarkdown(msg.content)}</div>}

              <div className="text-[10px] opacity-60 text-right mt-1">
                {formatTime(msg.createdAt)}
              </div>
            </div>

            {/* ACTIONS (FIXED) */}
            <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition self-end">
              <button
                onClick={() => handleCopyMessage(msg)}
                className="p-1 rounded-md hover:bg-black/10 transition"
                title="Copy"
              >
                <Copy size={14} />
              </button>

              <button
                onClick={() => startEditResend(msg)}
                className="p-1 rounded-md hover:bg-black/10 transition"
                title="Edit"
              >
                <Pencil size={14} />
              </button>

              {copiedMessageId === msg.id && (
                <span className="text-[10px] opacity-70 ml-1">Copied</span>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ================= AI ================= */}
      {msg.role === "assistant" && (
        <div className="flex justify-start">
          <div className="flex flex-col items-start">

            {/* AI label — always visible */}
            <span className="text-[11px] opacity-70">
              AI
            </span>

            {/* ── PENDING (thinking / using tool) ── */}
            {msg.meta?.isPending ? (
              <>
                <div className="text-sm text-neutral-500 mt-1">
                  {msg.meta.pendingAction || "Thinking..."}
                </div>
                <div className="flex gap-1 items-end mt-2">
                  <span className="w-1.5 h-1.5 bg-current rounded-full dot-jump" />
                  <span className="w-1.5 h-1.5 bg-current rounded-full dot-jump" />
                  <span className="w-1.5 h-1.5 bg-current rounded-full dot-jump" />
                </div>
              </>
            ) : (
              <>
                {/* Tool badge */}
                {msg.meta?.tool && (
                  <div className={
                    "inline-flex items-center gap-1 mt-1 mb-1 px-2 py-0.5 rounded-full text-[10px] font-medium " +
                    (isDark
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                      : "bg-amber-50 text-amber-700 border border-amber-200")
                  }>
                    <span>🔧</span>
                    <span>Used: {msg.meta.tool}</span>
                  </div>
                )}

                {/* AI-attached files (clickable download links) */}
                {msg.meta?.files?.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1 mb-1">
                    {msg.meta.files.map((file, idx) => {
                      const fileName = typeof file === "string"
                        ? file.split(/[\/\\]/).pop()
                        : (file.name || file.filename || `file-${idx + 1}`);
                      const fileUrl = typeof file === "string"
                        ? file
                        : (file.url || file.path || "#");
                      const isDownload = fileUrl.includes("/api/download/");
                      return (
                        <a
                          key={idx}
                          href={fileUrl}
                          download={isDownload ? fileName : undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={
                            "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium transition-opacity hover:opacity-80 " +
                            (isDark
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                              : "bg-amber-50 text-amber-700 border border-amber-200")
                          }
                          style={{ textDecoration: "none" }}
                        >
                          <FileDown size={12} />
                          {fileName}
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Message text */}
                <div
                  className={
                    "text-sm leading-relaxed whitespace-pre-wrap break-words mt-1 " +
                    (isDark ? "text-neutral-200" : "text-neutral-800")
                  }
                >
                  {renderMarkdown(msg.content)}
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default MessageBubble;
