'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './gridFinderHelper.module.css';

type Message = { id: string; role: 'user' | 'bot'; content: string };

// Minimal, safe Markdown → HTML for bot messages:
// - Escapes HTML
// - Supports **bold** and [text](url)
// - Converts newlines to <br>
function mdToSafeHtml(md: string) {
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // Escape first
  let html = esc(md);

  // **bold**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // [label](url) — only allow http(s) or /internal
  html = html.replace(
    /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)/g,
    (_m, label, url) =>
      `<a href="${url}" target="${String(url).startsWith('http') ? '_blank' : '_self'}" rel="noopener noreferrer">${label}</a>`
  );

  // Newlines → <br>
  html = html.replace(/\n/g, '<br/>');
  return html;
}

export default function GridFinderHelper() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', content: 'Hi! I’m the GridFinder Helper. How can I assist you today?' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      role: 'user',
      content: text,
    };
    const history = [...messages, userMsg].slice(-20);

    setMessages((m) => [...m, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { reply?: string };

      const botMsg: Message = {
        id: crypto.randomUUID?.() ?? String(Date.now() + 1),
        role: 'bot',
        content: (data.reply ?? "Sorry, I didn’t catch that.").trim(),
      };
      setMessages((m) => [...m, botMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID?.() ?? String(Date.now() + 2),
          role: 'bot',
          content: 'I hit a snag talking to Gemini. Try again in a moment.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        className={styles.fab}
        aria-label="Open GridFinder Helper"
        onClick={() => setOpen((v) => !v)}
      >
        💬
      </button>

      {open && (
        <div className={styles.chatbox}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <img src="/logo.svg" alt="Logo" className={styles.logo} />
              <h2 className={styles.title}>GridFinder Helper</h2>
            </div>
            <button
              className={styles.closeBtn}
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <div className={styles.messages}>
            {messages.map((msg) =>
              msg.role === 'bot' ? (
                <div
                  key={msg.id}
                  className={styles.botMessage}
                  dangerouslySetInnerHTML={{ __html: mdToSafeHtml(msg.content) }}
                />
              ) : (
                <div key={msg.id} className={styles.userMessage}>
                  {msg.content}
                </div>
              )
            )}
            {sending && (
              <div className={styles.botMessage}>
                <em>Typing…</em>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className={styles.inputArea}>
            <input
              type="text"
              placeholder="Write your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={sending}
            />
            <button onClick={send} disabled={sending}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
