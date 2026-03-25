function DeleteAllChatsModal({
  isDark,
  show,
  onCancel,
  confirmDeleteAllChats,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className={
          "w-80 p-5 rounded-xl shadow-lg " +
          (isDark
            ? "bg-neutral-800 text-neutral-100"
            : "bg-white text-neutral-900")
        }
      >
        <h1 className="text-lg font-semibold mb-3">
          Delete all chats?
        </h1>

        <p className="text-sm opacity-80 mb-5">
          This will permanently delete all chat history. This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className={
              "px-4 py-1 rounded-lg border " +
              (isDark
                ? "border-neutral-600 hover:bg-neutral-700"
                : "border-zinc-300 hover:bg-zinc-100")
            }
          >
            Cancel
          </button>

          <button
            onClick={confirmDeleteAllChats}
            className="px-4 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteAllChatsModal;
