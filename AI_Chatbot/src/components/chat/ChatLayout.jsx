import { useEffect, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import DeleteChatModal from "./DeleteChatModel";
import ToolSidebar from "./ToolSidebar";
import DeleteAllChatsModal from "./DeleteAllModels";

function ChatLayout({
  // state
  messages,
  input,
  files,
  isTyping,
  showScrollToBottom,
  copiedMessageId,
  setInput,
  isThinking,
  currentAction,

  // conversations
  conversations,
  activeConversationId,
  editingConversationId,
  editingConversationTitle,
  deleteConversationTargetId,

  // api status
  apiStatus,

  // ui
  isSidebarOpen,

  // derived
  isDark,
  hasMessages,
  hasInput,

  // refs
  fileInputRef,
  textareaRef,
  messagesContainerRef,

  // convo setters
  setIsSidebarOpen,
  setEditingConversationTitle,
  setDeleteConversationTargetId,

  // handlers
  handleSend,
  handleKeyDown,
  handleInputChange,
  handleFileClick,
  handleFileChange,
  toggleTheme,
  handleClearChat,
  handleScrollToBottom,
  handleDragOver,
  handleDrop,
  handleCopyMessage,
  startEditResend,
  editResendTarget,

  // convo handlers
  handleNewChat,
  handleSelectChat,
  handleDeleteChat,
  confirmDeleteChat,
  startEditChatTitle,
  saveChatTitle,
  cancelChatTitleEdit,

  isDictating,
  onToggleDictation,

  isToolSidebarOpen,
  setIsToolSidebarOpen,
  chatSuggestions,

  handleDeleteAllChats,
  showDeleteAllModal,
  setShowDeleteAllModal,

}) {
  const [showSuggestionsAnim, setShowSuggestionsAnim] = useState(false);
  useEffect(() => {
    if (chatSuggestions?.length > 0 && messages.length === 0 && !input) {
      const t = setTimeout(() => setShowSuggestionsAnim(true), 50);
      return () => clearTimeout(t);
    } else {
      setShowSuggestionsAnim(false);
    }
  }, [chatSuggestions, messages.length, input]);

  const commonIconClass = isDark
    ? "text-xs text-neutral-300 hover:text-neutral-50"
    : "text-xs text-zinc-500 hover:text-zinc-800";

  const iconBtn =
    "p-1 rounded-md hover:bg-black/10 transition flex items-center justify-center";

  return (
    <div
      className={
        "h-screen w-full relative overflow-hidden " +
        (isDark
          ? "bg-neutral-900 text-neutral-100"
          : "bg-zinc-100 text-neutral-900")
      }
    >
      <Sidebar
        isDark={isDark}
        isSidebarOpen={isSidebarOpen}
        conversations={conversations}
        activeConversationId={activeConversationId}
        editingConversationId={editingConversationId}
        editingConversationTitle={editingConversationTitle}
        setEditingConversationTitle={setEditingConversationTitle}
        handleNewChat={handleNewChat}
        handleSelectChat={handleSelectChat}
        handleDeleteChat={handleDeleteChat}
        startEditChatTitle={startEditChatTitle}
        saveChatTitle={saveChatTitle}
        cancelChatTitleEdit={cancelChatTitleEdit}
        setIsSidebarOpen={setIsSidebarOpen}
        setShowDeleteAllModal={setShowDeleteAllModal}
      />

      <ToolSidebar
        isDark={isDark}
        isToolSidebarOpen={isToolSidebarOpen}
        setIsToolSidebarOpen={setIsToolSidebarOpen}
        setInput={setInput}
        textareaRef={textareaRef}
      />

      {/* MAIN */}
      <main className="relative z-10 h-full flex flex-col">
        {!hasMessages && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-2xl font-semibold text-center opacity-80">
              Hello! How can I assist you today?
            </p>
          </div>
        )}

        <Header
          isDark={isDark}
          apiStatus={apiStatus}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          handleNewChat={handleNewChat}
          handleClearChat={handleClearChat}
          toggleTheme={toggleTheme}
          isToolSidebarOpen={isToolSidebarOpen}
          setIsToolSidebarOpen={setIsToolSidebarOpen}
        />

        {/* CENTER */}
        <div className="flex-1 min-h-0 flex justify-center">
          <div className="relative flex flex-col w-full max-w-3xl h-full min-h-0">
            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 min-h-0 px-4 flex flex-col gap-3 no-scrollbar overflow-y-auto pt-6 pb-4"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <MessageList
                messages={messages}
                isDark={isDark}
                handleCopyMessage={handleCopyMessage}
                copiedMessageId={copiedMessageId}
                startEditResend={startEditResend}
              />



            </div>

            {/* Scroll button */}
            {showScrollToBottom && (
              <button
                onClick={handleScrollToBottom}
                className={
                  "absolute right-6 bottom-24 w-9 h-9 rounded-full border shadow flex items-center justify-center text-lg " +
                  (isDark ? "bg-neutral-800" : "bg-white border-zinc-300")
                }
              >
                ↓
              </button>
            )}

            {chatSuggestions?.length > 0 &&
              messages.length === 0 &&
              !input && (
                <div
                  className={
                    "px-4 pb-2 flex justify-center transition-all duration-300 ease-out " +
                    (showSuggestionsAnim
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2")
                  }
                >

                  <div className="w-full max-w-3xl flex justify-center">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {chatSuggestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInput(q);
                            textareaRef.current?.focus();
                          }}
                          className={
                            "shrink-0 text-xs px-3 py-1.5 rounded-full border transition " +
                            (isDark
                              ? "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                              : "border-zinc-300 text-zinc-700 hover:bg-zinc-200")
                          }
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}


            <ChatInput
              isDark={isDark}
              input={input}
              files={files}
              hasInput={hasInput}
              textareaRef={textareaRef}
              fileInputRef={fileInputRef}
              handleInputChange={handleInputChange}
              handleKeyDown={handleKeyDown}
              handleSend={handleSend}
              handleFileClick={handleFileClick}
              handleFileChange={handleFileChange}
              isDictating={isDictating}
              onToggleDictation={onToggleDictation}
              editResendTarget={editResendTarget}
            />

            <DeleteChatModal
              isDark={isDark}
              deleteConversationTargetId={deleteConversationTargetId}
              setDeleteConversationTargetId={setDeleteConversationTargetId}
              confirmDeleteChat={confirmDeleteChat}
            />

            <DeleteAllChatsModal
              isDark={isDark}
              show={showDeleteAllModal}
              onCancel={() => setShowDeleteAllModal(false)}
              onConfirm={handleDeleteAllChats}
              confirmDeleteAllChats={handleDeleteAllChats}
            />

          </div>
        </div>
      </main>
    </div>
  );
}

export default ChatLayout;
