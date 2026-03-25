import { Paperclip, Mic } from "lucide-react";

function ChatInput({
  isDark,
  input,
  files,
  hasInput,
  textareaRef,
  fileInputRef,
  handleInputChange,
  handleKeyDown,
  handleSend,
  handleFileClick,
  handleFileChange,
  isDictating,
  onToggleDictation,
  editResendTarget,
}) {

  return (
    <div
      className={
        "px-4 py-3 " + (isDark ? "bg-neutral-900" : "bg-zinc-100")
      }
    >
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file, idx) => (
            <span
              key={idx}
              className={
                "text-[11px] px-2 py-1 rounded-full border flex items-center gap-1 " +
                (isDark
                  ? "border-neutral-600 bg-neutral-800/60"
                  : "border-[#d1d5db] bg-[#e5e7eb] text-[#111827]")
              }
            >
              <Paperclip size={14} /> {file.name}
            </span>
          ))}
        </div>
      )}

      <div
        className={
          "flex items-center gap-2 rounded-full px-3 py-1 border " +
          (isDark
            ? "bg-neutral-800 border-neutral-700"
            : "bg-white border-zinc-300")
        }
      >
        {/* Attach file */}
        <button
          onClick={handleFileClick}
          className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-black/10"
          disabled={isDictating}
        >
          <Paperclip size={16} />
        </button>

        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          className={
            "flex-1 bg-transparent outline-none text-sm resize-none h-10 py-2 overflow-hidden " +
            (isDark ? "text-neutral-100" : "text-neutral-900")
          }
          placeholder={
              isDictating
                ? "Listening..."
                : editResendTarget
                ? "Editing previous message…"
                : "Type your message..."
            }
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isDictating}

        />

        {/* Dictation mic */}
        <button
          type="button"
          onClick={onToggleDictation}
          className={
            "h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full " +
            (isDictating
              ? "bg-red-500 text-white"
              : "hover:bg-black/10")
          }
        >
          <Mic size={16} />
        </button>

        {/* Send / Resend */}
        <button
          disabled={!hasInput || isDictating}
          onClick={handleSend}
          className={
            "flex-shrink-0 h-8 px-4 rounded-full text-sm font-medium whitespace-nowrap " +
            (isDark
              ? "bg-neutral-700 disabled:opacity-50"
              : "bg-[#3f3f46] text-white hover:bg-[#27272a] disabled:opacity-50")
          }
        >
          {editResendTarget ? "Resend" : "Send"}
        </button>
      </div>
    </div>
  );
}

export default ChatInput;