// Format ISO timestamp into "HH:MM" (local area).
export const formatTime = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// check if two ISO timestamps are the same calender day.
export const isSameDay = (a, b) => {
  if (!a || !b) return false;
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// Data Label for spearators.
export const formatDateLabel = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (x, y) =>
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Generate a unique message id.
export const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());

// Message factory for "send" and "resend" buttons.
export const makeMessage = ({
  role,
  content = "",
  attachments = [],
  meta = undefined,
}) => ({
  id: makeId(),
  role, // "user" | "assistant" | "system" | "error"
  content,
  createdAt: new Date().toISOString(),
  attachments,
  ...(meta ? { meta } : {}),
});

export const saveGmailCredentials = (email, password) => {
  localStorage.setItem(
    "gmail_credentials",
    JSON.stringify({ email, password })
  );
};

export const getGmailCredentials = () => {
  try {
    return JSON.parse(localStorage.getItem("gmail_credentials")) || {};
  } catch {
    return {};
  }
};

