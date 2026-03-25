import { useState, useRef, useEffect } from "react";
import ChatLayout from "../components/chat/ChatLayout";
import { makeId, makeMessage } from "../utils/ChatHelpers";
import { sendMessage } from "../api/ChatApi";
import { TOOLS } from "../data/tools";

function ChatController() {
  // states.
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [theme, setTheme] = useState("dark");
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [editResendTarget, setEditResendTarget] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deleteConversationTargetId, setDeleteConversationTargetId] = useState(null);
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [editingConversationTitle, setEditingConversationTitle] = useState("");
  const [apiStatus, setApiStatus] = useState("checking");
  const [isDictating, setIsDictating] = useState(false);
  const [isToolSidebarOpen, setIsToolSidebarOpen] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);


  // Conversations (local “DB”)
  const LS_KEY = "a_plus_chat_conversations_v1";
  const ACTIVE_KEY = "a_plus_chat_active_v1";
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);

  // Refs.
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  // ID of the pending "thinking" message currently in the messages array
  const pendingMsgIdRef = useRef(null);

  // ── Status-label display queue ────────────────────────────────────────────
  // Each label is shown for MIN_ACTION_MS before the next one appears.
  // Labels are patched directly into the pending AI message so the "AI"
  // label is always inside a bubble and never flickers in/out.
  const MIN_ACTION_MS = 1500;
  const actionQueueRef = useRef([]);     // labels waiting to be shown
  const actionCurrentRef = useRef(null); // label currently on screen
  const actionTimerRef = useRef(null);   // current setTimeout handle
  const actionCallbackRef = useRef(null);// fires when queue empties

  // Patch pendingAction on the pending message in messages state
  const _setPendingAction = (label) => {
    const id = pendingMsgIdRef.current;
    if (!id) return;
    setMessages(prev =>
      prev.map(m =>
        m.id === id ? { ...m, meta: { ...m.meta, pendingAction: label } } : m
      )
    );
  };

  // Advance to next label; when queue empties fire the stored callback
  const _flushQueue = () => {
    actionTimerRef.current = null;
    if (actionQueueRef.current.length > 0) {
      const next = actionQueueRef.current.shift();
      actionCurrentRef.current = next;
      _setPendingAction(next);
      actionTimerRef.current = setTimeout(_flushQueue, MIN_ACTION_MS);
    } else {
      // Queue drained — fire callback (replaces pending msg with real response)
      actionCurrentRef.current = null;
      const cb = actionCallbackRef.current;
      actionCallbackRef.current = null;
      cb?.();
    }
  };

  // Enqueue a status label; each gets MIN_ACTION_MS on screen
  const showAction = (label) => {
    // Deduplicate consecutive identical labels
    const lastQueued = actionQueueRef.current.length > 0
      ? actionQueueRef.current[actionQueueRef.current.length - 1]
      : actionCurrentRef.current;
    if (lastQueued === label) return;
    if (actionCurrentRef.current === null) {
      actionCurrentRef.current = label;
      _setPendingAction(label);
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
      actionTimerRef.current = setTimeout(_flushQueue, MIN_ACTION_MS);
    } else {
      actionQueueRef.current.push(label);
    }
  };

  // Call when the API response is ready.
  // onDone fires AFTER the last queued label finishes, then replaces
  // the pending message with the real response in one React render.
  const finishAction = (onDone) => {
    if (actionCurrentRef.current === null && actionQueueRef.current.length === 0) {
      onDone(); // nothing queued — respond immediately
    } else {
      actionCallbackRef.current = onDone;
    }
  };

  // Reset everything before a new send
  const _resetActionQueue = () => {
    if (actionTimerRef.current) { clearTimeout(actionTimerRef.current); actionTimerRef.current = null; }
    actionQueueRef.current = [];
    actionCurrentRef.current = null;
    actionCallbackRef.current = null;
  };

  // Derived flags.
  const isDark = theme === "dark";
  const hasMessages = messages.length > 0;
  const hasInput = input.trim().length > 0 || files.length > 0;

  // ----------------------------------------
  // Pick random 3 or 5 suggestion questions
  // ----------------------------------------
  function pickRandomSuggestions() {
    const all = TOOLS.flatMap(t => t.suggestions || []);

    return [...all]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
  }

  // ---------------------------
  // Local storage helpers
  // ---------------------------
  const saveToLocal = (convs, activeId) => {
    localStorage.setItem(LS_KEY, JSON.stringify(convs));
    if (activeId !== undefined) {
      localStorage.setItem(ACTIVE_KEY, activeId ?? "");
    }
  };

  const loadFromLocal = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const createConversation = () => {
    const now = new Date().toISOString();
    return {
      id: makeId(),
      title: "New chat",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
  };

  const setActiveConversation = (id, convs) => {
    setActiveConversationId(id);
    const found = convs.find((c) => c.id === id);
    setMessages(found?.messages || []);
  };

  const ensureActiveConversation = () => {
    if (activeConversationId) return activeConversationId;

    const fresh = createConversation();
    const next = [fresh, ...conversations];

    setConversations(next);
    saveToLocal(next);

    setActiveConversationId(fresh.id);
    return fresh.id;
  };

  const updateActiveMessages = (nextMessages) => {
    setMessages(nextMessages);

    const convoId = activeConversationId || ensureActiveConversation();

    setConversations((prev) => {
      const now = new Date().toISOString();

      const firstUserMsg = nextMessages.find(
        (m) => m.role === "user" && m.content?.trim()
      );

      const updated = prev.map((c) => {
        if (c.id !== convoId) return c;

        let title = c.title;
        if (title.toLowerCase() === "new chat" && firstUserMsg) {
          title = autoTitleFromMessage(firstUserMsg.content);
        }

        return { ...c, title, updatedAt: now, messages: nextMessages };
      });

      saveToLocal(updated);
      return updated;
    });
  };

  // ---------------------------
  // Chats
  // ---------------------------
  const handleNewChat = () => {
    const fresh = createConversation();
    const next = [fresh, ...conversations];

    setConversations(next);
    saveToLocal(next);

    setActiveConversationId(fresh.id);
    setMessages([]);

    setChatSuggestions(pickRandomSuggestions());
    setIsSidebarOpen(false);
  };

  const handleSelectChat = (id) => {
    setActiveConversation(id, conversations);
  };

  const handleDeleteChat = (id) => {
    setDeleteConversationTargetId(id);
  };

  const confirmDeleteChat = () => {
    if (!deleteConversationTargetId) return;

    setConversations((prev) => {
      const next = prev.filter(
        (c) => c.id !== deleteConversationTargetId
      );
      saveToLocal(next);

      // If deleted chat was active, switch or reset
      if (deleteConversationTargetId === activeConversationId) {
        if (next.length > 0) {
          setActiveConversationId(next[0].id);
          setMessages(next[0].messages || []);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }

      return next;
    });

    setDeleteConversationTargetId(null);
  };

  function autoTitleFromMessage(text) {
    if (!text) return "New chat";

    return text
      .trim()
      .slice(0, 40)
      .replace(/\s+/g, " ");
  }


  // ---------------------------
  // LOAD CONVERSATIONS
  // ---------------------------
  useEffect(() => {
    const stored = loadFromLocal();
    if (stored && Array.isArray(stored) && stored.length > 0) {
      setConversations(stored);
    }
    setIsHydrated(true);
  }, []);

  // Persist the active conversation ID so it survives a refresh
  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem(ACTIVE_KEY, activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (!isHydrated) return;

    const stored = loadFromLocal();
    const convs = stored && Array.isArray(stored) ? stored : [];
    const savedActiveId = localStorage.getItem(ACTIVE_KEY);
    const savedActive = convs.find((c) => c.id === savedActiveId);

    if (savedActive && savedActive.messages?.length === 0) {
      // Last active chat was empty — restore it as-is, no new chat needed
      setConversations(convs);
      setActiveConversationId(savedActive.id);
      setMessages([]);
    } else if (savedActive && savedActive.messages?.length > 0) {
      // Last active chat had messages — create a new blank chat
      const fresh = createConversation();
      const next = [fresh, ...convs];
      setConversations(next);
      saveToLocal(next, fresh.id);
      setActiveConversationId(fresh.id);
      setMessages([]);
    } else {
      // No saved state or saved chat not found — create a fresh chat
      const fresh = createConversation();
      const next = [fresh, ...convs];
      setConversations(next);
      saveToLocal(next, fresh.id);
      setActiveConversationId(fresh.id);
      setMessages([]);
    }

    setChatSuggestions(pickRandomSuggestions());
  }, [isHydrated]);

  const startEditChatTitle = (id, currentTitle) => {
    setEditingConversationId(id);
    setEditingConversationTitle(currentTitle || "");
  };

  const saveChatTitle = () => {
    const id = editingConversationId;
    if (!id) return;

    const title = (editingConversationTitle || "").trim() || "New chat";

    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, title } : c));
      saveToLocal(updated);
      return updated;
    });

    setEditingConversationId(null);
    setEditingConversationTitle("");
  };

  const cancelChatTitleEdit = () => {
    setEditingConversationId(null);
    setEditingConversationTitle("");
  };

  // ---------------------------
  // SEND / EDIT & RESEND
  // ---------------------------
  const handleSend = async () => {
    const text = input.trim();
    const hasFiles = files.length > 0;
    const currentFiles = files;

    // Reset queue so any stale state from a prior send doesn't bleed through
    _resetActionQueue();
    // Real-time event handler from the SSE stream
    const onEvent = (type, data) => {
      if (type === "tool") {
        showAction(`Using: ${data}`);
      } else if (type === "thinking") {
        showAction("Thinking...");
      }
    };

    if (editResendTarget) {
      const idx = messages.findIndex((m) => m.id === editResendTarget);
      if (idx === -1) return;

      const base = messages.slice(0, idx);
      const editedMsg = makeMessage({ role: "user", content: text });
      const next = [...base, editedMsg];

      updateActiveMessages(next);
      setInput("");
      setEditResendTarget(null);
      setFiles([]);

      setIsTyping(true);
      showAction("Thinking...");

      // Add a pending AI message so the "AI" label is immediately visible
      const pendingId = makeId();
      pendingMsgIdRef.current = pendingId;
      const pendingMsg = {
        id: pendingId,
        role: "assistant",
        content: null,
        createdAt: new Date().toISOString(),
        attachments: [],
        meta: { isPending: true, pendingAction: "Thinking..." },
      };
      updateActiveMessages([...next, pendingMsg]);

      try {
        const data = await sendMessage(text, currentFiles, onEvent);
        const realMsg = makeMessage({
          role: "assistant",
          content: data.response,
          meta: {
            ...(data.tool ? { tool: data.tool } : {}),
            ...(data.files?.length ? { files: data.files } : {}),
          } || undefined,
        });
        finishAction(() => {
          pendingMsgIdRef.current = null;
          setIsTyping(false);
          updateActiveMessages([...next, realMsg]);
        });
      } catch {
        finishAction(() => {
          pendingMsgIdRef.current = null;
          setIsTyping(false);
          updateActiveMessages(next);
        });
      }
      return;
    }

    if (!text && !hasFiles) return;

    const attachments = hasFiles
      ? files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type || "",
        url: URL.createObjectURL(f),
      }))
      : [];

    const next = [
      ...messages,
      makeMessage({
        role: "user",
        content: text,
        attachments,
      }),
    ];

    updateActiveMessages(next);
    setInput("");
    setFiles([]);

    // Reset textarea height after clearing input
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }

    setIsTyping(true);
    showAction("Thinking...");

    // Add a pending AI message so the "AI" label is immediately visible
    const pendingId = makeId();
    pendingMsgIdRef.current = pendingId;
    const pendingMsg = {
      id: pendingId,
      role: "assistant",
      content: null,
      createdAt: new Date().toISOString(),
      attachments: [],
      meta: { isPending: true, pendingAction: "Thinking..." },
    };
    updateActiveMessages([...next, pendingMsg]);

    try {
      const data = await sendMessage(text, currentFiles, onEvent);
      const realMsg = makeMessage({
        role: "assistant",
        content: data.response,
        meta: {
          ...(data.tool ? { tool: data.tool } : {}),
          ...(data.files?.length ? { files: data.files } : {}),
        } || undefined,
      });
      finishAction(() => {
        pendingMsgIdRef.current = null;
        setIsTyping(false);
        updateActiveMessages([...next, realMsg]);
      });
    } catch {
      finishAction(() => {
        pendingMsgIdRef.current = null;
        setIsTyping(false);
        updateActiveMessages(next);
      });
    }
  };



  // ---------------------------
  // INPUT
  // ---------------------------
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "40px";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };


  const handleClearChat = () => {
    updateActiveMessages([]);
    setFiles([]);
    setCopiedMessageId(null);
    setIsTyping(false);
    setEditResendTarget(null);
  };



  // ---------------------------
  // FILES
  // ---------------------------
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (!droppedFiles.length) return;
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  // ---------------------------
  // THEME
  // ---------------------------
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // ---------------------------
  // SCROLL
  // ---------------------------
  const handleScrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distance =
        el.scrollHeight - (el.scrollTop + el.clientHeight);
      setShowScrollToBottom(distance > 10 && el.scrollTop > 0);
    };

    el.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => el.removeEventListener("scroll", handleScroll);
  }, [messages.length, isDictating]);

  // Auto-scroll to bottom whenever a new message arrives or the AI starts typing
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, isTyping]);

  // ---------------------------
  // EDIT & RESEND 
  // ---------------------------
  const startEditResend = (msg) => {
    setInput(msg.content);
    setEditResendTarget(msg.id);
    textareaRef.current?.focus();
  };

  // ---------------------------
  // COPY
  // ---------------------------
  const handleCopyMessage = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg.content || "");
      setCopiedMessageId(msg.id);
      setTimeout(() => setCopiedMessageId(null), 1200);
    } catch { }
  };

  // ---------------------------
  // DICTATION
  // ---------------------------
  const toggleDictation = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (!recognitionRef.current) {
      const r = new SpeechRecognition();
      r.lang = "en-US";
      r.continuous = false;
      r.interimResults = false;

      r.onstart = () => setIsDictating(true);
      r.onend = () => setIsDictating(false);
      r.onerror = () => setIsDictating(false);
      r.onresult = (e) => {
        const t = e.results[0][0].transcript.trim();
        setInput((p) => (p ? p + " " + t : t));
      };

      recognitionRef.current = r;
    }

    isDictating
      ? recognitionRef.current.stop()
      : recognitionRef.current.start();
  };

  // ---------------------------
  // API STATUS CHECK (FIX)
  // ---------------------------
  useEffect(() => {
    let alive = true;

    const API_BASE =
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    const HEALTH_URL = `${API_BASE}/api/health`;

    const ping = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);

        const res = await fetch(HEALTH_URL, {
          method: "GET",
          signal: controller.signal,
        });

        clearTimeout(timeout);
        if (!alive) return;

        setApiStatus(res.ok ? "online" : "offline");
      } catch {
        if (!alive) return;
        setApiStatus("offline");
      }
    };

    ping();
    const interval = setInterval(ping, 4000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const handleDeleteAllChats = () => {
    // Clear everything and save a fresh conversation
    const fresh = createConversation();
    const next = [fresh];

    setConversations(next);
    setMessages([]);
    saveToLocal(next, fresh.id);
    localStorage.removeItem(ACTIVE_KEY);

    // Start with a fresh chat
    setActiveConversationId(fresh.id);
    setChatSuggestions(pickRandomSuggestions());
    setIsSidebarOpen(false);

    setShowDeleteAllModal(false);
  };


  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <ChatLayout
      //  state
      messages={messages}
      input={input}
      files={files}
      theme={theme}
      isTyping={isTyping}
      showScrollToBottom={showScrollToBottom}
      copiedMessageId={copiedMessageId}
      isSidebarOpen={isSidebarOpen}
      deleteConversationTargetId={deleteConversationTargetId}
      editingConversationId={editingConversationId}
      editingConversationTitle={editingConversationTitle}
      apiStatus={apiStatus}
      isDictating={isDictating}
      editResendTarget={editResendTarget}
      isToolSidebarOpen={isToolSidebarOpen}
      chatSuggestions={chatSuggestions}
      showDeleteAllModal={showDeleteAllModal}

      // conversation 
      conversations={conversations}
      activeConversationId={activeConversationId}

      // Derived
      isDark={isDark}
      hasMessages={hasMessages}
      hasInput={hasInput}

      // Refs
      fileInputRef={fileInputRef}
      textareaRef={textareaRef}
      messagesContainerRef={messagesContainerRef}

      // Handlers
      handleSend={handleSend}
      handleKeyDown={handleKeyDown}
      handleInputChange={handleInputChange}
      handleFileClick={handleFileClick}
      handleFileChange={handleFileChange}
      toggleTheme={toggleTheme}
      handleScrollToBottom={handleScrollToBottom}
      handleClearChat={handleClearChat}
      handleDragOver={handleDragOver}
      handleDrop={handleDrop}
      startEditResend={startEditResend}
      handleCopyMessage={handleCopyMessage}
      setDeleteConversationTargetId={setDeleteConversationTargetId}
      setIsSidebarOpen={setIsSidebarOpen}
      setEditingConversationTitle={setEditingConversationTitle}
      startEditChatTitle={startEditChatTitle}
      saveChatTitle={saveChatTitle}
      confirmDeleteChat={confirmDeleteChat}
      cancelChatTitleEdit={cancelChatTitleEdit}
      onToggleDictation={toggleDictation}
      setIsToolSidebarOpen={setIsToolSidebarOpen}
      setInput={setInput}
      setShowDeleteAllModal={setShowDeleteAllModal}
      handleDeleteAllChats={handleDeleteAllChats}

      // convo handlers
      handleNewChat={handleNewChat}
      handleSelectChat={handleSelectChat}
      handleDeleteChat={handleDeleteChat}

    />
  );
}

export default ChatController;
