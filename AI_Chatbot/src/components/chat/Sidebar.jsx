import { Plus, MessageSquare, Pencil, Trash2, Check, X } from "lucide-react";

function Sidebar({
  isDark,
  isSidebarOpen,
  conversations,
  activeConversationId,
  editingConversationId,
  editingConversationTitle,
  setEditingConversationTitle,
  handleNewChat,
  handleSelectChat,
  handleDeleteChat,
  startEditChatTitle,
  saveChatTitle,
  cancelChatTitleEdit,
  setIsSidebarOpen,
  setShowDeleteAllModal,
}) {
  return (
    <>
      {/* SIDEBAR DRAWER */}
      <div
        className={
          "absolute inset-y-0 left-0 z-40 w-72 border-r " +
          "transform transition-transform duration-200 ease-out " +
          (isSidebarOpen ? "translate-x-0" : "-translate-x-full") +
          (isDark
            ? " bg-neutral-900 border-neutral-800"
            : " bg-zinc-100 border-zinc-200")
        }
        aria-hidden={!isSidebarOpen}
      >
        <div className="px-3 pt-4 pb-3 flex items-center justify-between">
          {/* Left */}
          <div className="text-sm font-semibold">Chats</div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNewChat}
              className={
                "h-8 w-8 rounded-md flex items-center justify-center border transition " +
                (isDark
                  ? "border-neutral-700 hover:bg-neutral-800"
                  : "border-zinc-300 hover:bg-zinc-200")
              }
              title="New chat"
            >
              <Plus size={16} />
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteAllModal(true)}
              className={
                "h-8 w-8 rounded-md flex items-center justify-center transition " +
                (isDark
                  ? "text-red-400 hover:bg-neutral-800"
                  : "text-red-500 hover:bg-zinc-200")
              }
              title="Delete all chats"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>


        <div className="px-2 pb-3 overflow-y-auto no-scrollbar h-[calc(100vh-64px)]">
          {(conversations || []).map((c) => {
            const active = c.id === activeConversationId;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectChat(c.id)}
                className={
                  "w-full text-left px-2 py-2 rounded-lg mb-1 flex items-center gap-2 transition " +
                  (active
                    ? isDark
                      ? "bg-neutral-800"
                      : "bg-white border border-zinc-200"
                    : isDark
                      ? "hover:bg-neutral-800/60"
                      : "hover:bg-zinc-200")
                }
              >
                <MessageSquare size={16} className="opacity-70 shrink-0" />

                <div className="flex-1 min-w-0">
                  {editingConversationId === c.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={editingConversationTitle}
                        onChange={(e) =>
                          setEditingConversationTitle(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveChatTitle();
                          if (e.key === "Escape") cancelChatTitleEdit();
                        }}
                        className={
                          "w-full text-xs px-2 py-1 rounded border outline-none " +
                          (isDark
                            ? "bg-neutral-900 border-neutral-700 text-neutral-100"
                            : "bg-white border-zinc-300 text-zinc-900")
                        }
                        autoFocus
                      />

                      <dev
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          saveChatTitle();
                        }}
                        className={
                          "p-1 rounded-md transition " +
                          (isDark
                            ? "text-neutral-200 hover:bg-neutral-700/60"
                            : "text-zinc-700 hover:bg-zinc-300/60")
                        }
                        title="Save"
                      >
                        <Check size={14} />
                      </dev>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          cancelChatTitleEdit();
                        }}
                        className={
                          "p-1 rounded-md transition " +
                          (isDark
                            ? "text-neutral-200 hover:bg-neutral-700/60"
                            : "text-zinc-700 hover:bg-zinc-300/60")
                        }
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs font-medium truncate">
                        {c.title || "New chat"}
                      </div>
                      <div className="text-[10px] opacity-60 truncate">
                        {c.updatedAt
                          ? new Date(c.updatedAt).toLocaleString()
                          : ""}
                      </div>
                    </>
                  )}
                </div>

                {editingConversationId !== c.id && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startEditChatTitle(c.id, c.title);
                      }}
                      className={
                        "p-1 rounded-md transition " +
                        (isDark
                          ? "text-neutral-300 hover:bg-neutral-700/60"
                          : "text-zinc-600 hover:bg-zinc-300/60")
                      }
                      title="Rename"
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteChat(c.id);
                      }}
                      className={
                        "p-1 rounded-md transition " +
                        (isDark
                          ? "text-neutral-300 hover:bg-neutral-700/60"
                          : "text-zinc-600 hover:bg-zinc-300/60")
                      }
                      title="Delete permanently"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* BACKDROP */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(false)}
        className={
          "hidden"
        }
        style={{ background: "rgba(0,0,0,0.35)" }}
        aria-hidden={!isSidebarOpen}
        tabIndex={-1}
      />
      {/* Backdrop to close drawer */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(false)}
        className={
          "absolute inset-0 z-30 transition-opacity duration-200 " +
          (isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none")
        }
        style={{ background: "rgba(0,0,0,0.35)" }}
        aria-hidden={!isSidebarOpen}
        tabIndex={-1}
      />
    </>


  );
}

export default Sidebar;
