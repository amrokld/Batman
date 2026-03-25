import MessageBubble from "./MessageBubble";

function MessageList({
  messages,
  isDark,
  handleCopyMessage,
  copiedMessageId,
  startEditResend,
}) {

  return (
    <div className="flex flex-col gap-6">
      {messages.map((msg, index) => {
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const isUser = msg.role === "user";

        return (
          <MessageBubble
            key={msg.id}
            msg={msg}
            prevMsg={messages[index - 1]}
            isDark={isDark}
            isUser={msg.role === "user"}
            handleCopyMessage={handleCopyMessage}
            copiedMessageId={copiedMessageId}
            startEditResend={startEditResend}
          />

        );
      })}
    </div>
  );
}

export default MessageList;
