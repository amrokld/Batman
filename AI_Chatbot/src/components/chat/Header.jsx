function Header({
  isDark,
  apiStatus,
  isSidebarOpen,
  setIsSidebarOpen,
  handleNewChat,
  handleClearChat,
  toggleTheme,
  isToolSidebarOpen,
  setIsToolSidebarOpen,
}) {
  
  // header word-button style (same as your Clear/Dark mode)
  const headerWordBtn = (extra = "") =>
    "text-[11px] px-3 py-1 rounded-full border transition " +
    extra +
    (isDark
      ? " border-neutral-700 text-neutral-200 hover:bg-neutral-800"
      : " border-zinc-300 text-zinc-700 hover:bg-zinc-200");

  // API badge style: same shape/size as headerWordBtn, but colored
  const apiBadgeClass =
    "text-[11px] px-3 py-1 rounded-full border transition flex items-center gap-2 " +
    (apiStatus === "online"
      ? isDark
        ? "border-emerald-700 text-emerald-200 bg-emerald-900/20"
        : "border-emerald-300 text-emerald-700 bg-emerald-50"
      : apiStatus === "offline"
      ? isDark
        ? "border-red-700 text-red-200 bg-red-900/20"
        : "border-red-300 text-red-700 bg-red-50"
      : isDark
      ? "border-neutral-700 text-neutral-200 bg-neutral-800"
      : "border-zinc-300 text-zinc-700 bg-white");

  const apiDotClass =
    "w-2 h-2 rounded-full " +
    (apiStatus === "online"
      ? "bg-emerald-400"
      : apiStatus === "offline"
      ? "bg-red-400"
      : "bg-zinc-400");

  const apiLabel =
    apiStatus === "online"
      ? "Online"
      : apiStatus === "offline"
      ? "Offline"
      : "Checking";

  return (
    <div>
      {/* FULL-WIDTH HEADER (corners) */}
      <div
        className={
          "px-4 pt-4 pb-3 border-b " +
          (isDark
            ? "bg-neutral-900 border-neutral-800"
            : "bg-zinc-100 border-zinc-200")
        }
      >
        <div className="relative flex items-center w-full">
          {/* LEFT */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((v) => !v)}
              className={headerWordBtn()}
            >
              {isSidebarOpen ? "Hide chats" : "Chats"}
            </button>

            <button
              type="button"
              onClick={handleNewChat}
              className={headerWordBtn()}
            >
              New chat
            </button>

            <button
              type="button"
              onClick={handleClearChat}
              className={headerWordBtn()}
            >
              Clear
            </button>
          </div>

          {/* CENTER */}
          <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
            <h1 className="text-sm font-semibold">AI Chatbot</h1>
            <p className="text-[11px] opacity-70">Local assistant</p>
          </div>

          {/* RIGHT */}
          <div className="ml-auto mr-2 flex items-center gap-2">
            <span className={apiBadgeClass}>
              <span className={apiDotClass} />
              API {apiLabel}
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              className={
                "text-[11px] px-3 py-1 rounded-full border transition " +
                (isDark
                  ? "bg-neutral-800 border-neutral-700"
                  : "bg-white border-zinc-300")
              }
            >
              {isDark ? "Light mode" : "Dark mode"}
            </button>

            <button
              type="button"
              onClick={() => setIsToolSidebarOpen(v => !v)}
              className={
                "text-[11px] px-3 py-1 rounded-full border transition " +
                (isToolSidebarOpen
                  ? isDark
                    ? "bg-neutral-800 border-neutral-600"
                    : "bg-zinc-200 border-zinc-400"
                  : isDark
                  ? "border-neutral-700 hover:bg-neutral-800"
                  : "border-zinc-300 hover:bg-zinc-200")
              }
            >
              Tools
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;