import { useState } from "react";
import { TOOLS } from "../../data/tools";
import GmailModel from "./GmailModel";

function ToolSidebar({
  isDark,
  isToolSidebarOpen,
  setIsToolSidebarOpen,
  setInput,
  textareaRef,
}) {

  const [showGmailModel, setShowGmailModel] = useState(false);

  return (
    <>
      <div
        className={
          "absolute inset-y-0 right-0 z-40 w-72 border-l flex flex-col " +
          "transform transition-transform duration-200 ease-out " +
          (isToolSidebarOpen ? "translate-x-0" : "translate-x-full") +
          (isDark
            ? " bg-neutral-900 border-neutral-800"
            : " bg-zinc-100 border-zinc-200")
        }
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
          <div className="text-sm font-semibold">Tools</div>

          <div className="flex items-center gap-2">
            {/* Gmail Button */}
            <button
              onClick={() => setShowGmailModel(true)}
              className={
                "text-xs px-2 py-1 rounded transition " +
                (isDark
                  ? "hover:bg-neutral-800 text-neutral-300"
                  : "hover:bg-zinc-200 text-zinc-700")
              }
            >
              Gmail
            </button>

            {/* Close Button */}
            <button
              onClick={() => setIsToolSidebarOpen(false)}
              className="text-xs opacity-60 hover:opacity-100"
            >
              Close
            </button>
          </div>
        </div>

        {/* Tools List */}
        <div className="flex-1 px-4 pb-4 space-y-4 overflow-y-auto no-scrollbar text-sm">
          {TOOLS.map((tool) => (
            <div
              key={tool.name}
              className={
                "p-3 rounded-lg border " +
                (isDark
                  ? "border-neutral-800 bg-neutral-900"
                  : "border-zinc-200 bg-white")
              }
            >
              <div className="font-semibold text-sm mb-1">
                {tool.name}
              </div>

              <div className="text-xs opacity-70 mb-2">
                {tool.description}
              </div>

              {tool.suggestions?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tool.suggestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(q);
                        textareaRef.current?.focus();
                      }}
                      className={
                        "text-[11px] px-2 py-1 rounded-full border transition " +
                        (isDark
                          ? "border-neutral-700 hover:bg-neutral-800"
                          : "border-zinc-300 hover:bg-zinc-200")
                      }
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {TOOLS.length === 0 && (
            <div className="text-xs opacity-60">
              No tools defined.
            </div>
          )}
        </div>
      </div>

      {/* Gmail Model Component */}
      <GmailModel
        isDark={isDark}
        show={showGmailModel}
        onClose={() => setShowGmailModel(false)}
      />
    </>
  );
}

export default ToolSidebar;