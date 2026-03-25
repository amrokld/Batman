import { useState, useEffect } from "react";

function GmailModel({ isDark, show, onClose }) {
    if (!show) return null;

    const stored = JSON.parse(localStorage.getItem("gmail_credentials") || "{}");

    const [email, setEmail] = useState(stored.email || "");
    const [password, setPassword] = useState(stored.password || "");
    const [locked, setLocked] = useState(!!stored.email && !!stored.password);

    useEffect(() => {
        if (show) {
            const creds = JSON.parse(localStorage.getItem("gmail_credentials") || "{}");
            setEmail(creds.email || "");
            setPassword(creds.password || "");
            setLocked(!!creds.email && !!creds.password);
        }
    }, [show]);

    const handleSave = () => {
        localStorage.setItem(
            "gmail_credentials",
            JSON.stringify({ email, password })
        );
        setLocked(true);
    };

    const handleChange = () => {
        setLocked(false);
    };

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
                    Gmail Setup
                </h1>

                <div className="mb-4 space-y-2">
                    <input
                        placeholder="Email"
                        value={email}
                        disabled={locked}
                        onChange={(e) => setEmail(e.target.value)}
                        className={
                            "w-full px-3 py-2 rounded-lg text-sm outline-none " +
                            (isDark
                                ? "bg-neutral-700 text-white placeholder-neutral-400"
                                : "bg-zinc-100 text-black placeholder-zinc-500") +
                            (locked ? " opacity-60 cursor-not-allowed" : "")
                        }
                    />

                    <input
                        type="password"
                        placeholder="App Password"
                        value={password}
                        disabled={locked}
                        onChange={(e) => setPassword(e.target.value)}
                        className={
                            "w-full px-3 py-2 rounded-lg text-sm outline-none " +
                            (isDark
                                ? "bg-neutral-700 text-white placeholder-neutral-400"
                                : "bg-zinc-100 text-black placeholder-zinc-500") +
                            (locked ? " opacity-60 cursor-not-allowed" : "")

                        }

                    />
                </div>
                <p className="text-[11px] opacity-70 mt-1">
                    Use a Google App Password (not your Gmail password). Generate it from your Google account security settings.
                </p>

                <div className="flex justify-end gap-3 mt-4">
                    {/* Change button (only when locked) */}
                    {locked && (
                        <button
                            onClick={handleChange}
                            className={
                                "px-4 py-1 rounded-lg border " +
                                (isDark
                                    ? "border-neutral-600 hover:bg-neutral-700"
                                    : "border-zinc-300 hover:bg-zinc-100")
                            }
                        >
                            Change
                        </button>
                    )}

                    {/* Save button (only when editing) */}
                    {!locked && (
                        <button
                            onClick={handleSave}
                            className="px-4 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                            Save
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className={
                            "px-4 py-1 rounded-lg border " +
                            (isDark
                                ? "border-neutral-600 hover:bg-neutral-700"
                                : "border-zinc-300 hover:bg-zinc-100")
                        }
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GmailModel;