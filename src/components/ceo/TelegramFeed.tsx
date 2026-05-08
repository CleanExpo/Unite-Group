"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, MessageSquare, Wifi, WifiOff } from "lucide-react";

interface TelegramMessage {
  id: string;
  from: string;
  text: string;
  ts: string;
  isBot: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function TelegramFeed() {
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/telegram/feed?limit=30");
      if (res.ok) {
        const data = await res.json();
        const fetched: TelegramMessage[] = data.messages || [];
        // Merge: keep optimistic messages not yet confirmed in DB
        setMessages(prev => {
          const dbIds = new Set(fetched.map(m => m.id));
          const pendingOptimistic = prev.filter(m => m.id.startsWith("opt-") && !dbIds.has(m.id));
          return [...fetched, ...pendingOptimistic];
        });
        setConnected(true);
        setLastFetch(new Date());
      }
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 15_000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");

    // Optimistic add
    const optimistic: TelegramMessage = {
      id: `opt-${Date.now()}`,
      from: "Phill",
      text,
      ts: new Date().toISOString(),
      isBot: false,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      // Send to Telegram AND store in DB immediately (so it persists in feed)
      await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, persist: true }),
      });
      // Replace optimistic with real DB entry after short delay
      setTimeout(fetchMessages, 3000);
      setTimeout(fetchMessages, 8000);
      setTimeout(fetchMessages, 20000); // Margot response window
    } catch {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const noMessages = messages.length === 0;

  return (
    <div style={{
      background: "#111113",
      backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 50%)",
      border: "1px solid #27272a",
      borderRadius: 12,
      display: "flex",
      flexDirection: "column",
      height: 400,
      overflow: "hidden",
    }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid #27272a", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquare size={13} color="#1d4ed8" />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#fafafa", letterSpacing: "-0.01em" }}>
            Margot — Live
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {connected
            ? <><Wifi size={10} color="#16a34a" /><span style={{ fontSize: 9, color: "#16a34a", fontFamily: "var(--font-mono)" }}>Connected</span></>
            : <><WifiOff size={10} color="#52525b" /><span style={{ fontSize: 9, color: "#52525b", fontFamily: "var(--font-mono)" }}>Offline</span></>
          }
          {lastFetch && (
            <span style={{ fontSize: 9, color: "#3f3f46", fontFamily: "var(--font-mono)", marginLeft: 4 }}>
              {formatTime(lastFetch.toISOString())}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "12px 14px",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        {noMessages ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
            <MessageSquare size={24} color="#27272a" />
            <p style={{ fontSize: 11, color: "#52525b", margin: 0, textAlign: "center" }}>
              No messages yet.<br />Send Margot a command below.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                style={{
                  display: "flex",
                  flexDirection: msg.isBot ? "row" : "row-reverse",
                  gap: 7,
                  alignItems: "flex-end",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: msg.isBot ? "#1d4ed8" : "#27272a",
                  fontSize: 9, fontWeight: 700, color: "#fafafa",
                }}>
                  {msg.isBot ? "M" : "P"}
                </div>

                {/* Bubble */}
                <div style={{ maxWidth: "80%" }}>
                  <div style={{
                    padding: "8px 11px",
                    borderRadius: msg.isBot ? "10px 10px 10px 3px" : "10px 10px 3px 10px",
                    background: msg.isBot ? "#1d4ed8" : "#18181b",
                    border: msg.isBot ? "none" : "1px solid #27272a",
                    fontSize: 12,
                    color: msg.isBot ? "#fff" : "#d4d4d8",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.text}
                  </div>
                  <div style={{
                    fontSize: 9, color: "#3f3f46", marginTop: 3, fontFamily: "var(--font-mono)",
                    textAlign: msg.isBot ? "left" : "right", paddingLeft: msg.isBot ? 4 : 0, paddingRight: msg.isBot ? 0 : 4,
                  }}>
                    {msg.from} · {formatTime(msg.ts)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 12px",
        borderTop: "1px solid #27272a", flexShrink: 0,
        background: "#0c0c0e",
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
          placeholder="Message Margot…"
          style={{
            flex: 1, padding: "7px 11px", fontSize: 12,
            background: "#111113", border: "1px solid #27272a",
            borderRadius: 8, color: "#fafafa", outline: "none",
            fontFamily: "var(--font-display)", transition: "border-color 0.1s",
          }}
          onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
          onBlur={e => (e.target.style.borderColor = "#27272a")}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: input.trim() && !sending ? "#1d4ed8" : "#18181b",
            color: input.trim() && !sending ? "#fff" : "#52525b",
            cursor: input.trim() && !sending ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.1s ease", flexShrink: 0,
          }}
          onMouseEnter={e => { if (input.trim() && !sending) (e.currentTarget as HTMLButtonElement).style.background = "#3b82f6"; }}
          onMouseLeave={e => { if (input.trim() && !sending) (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8"; }}
        >
          {sending ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
        </button>
      </div>
    </div>
  );
}
