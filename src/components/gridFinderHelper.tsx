'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './gridFinderHelper.module.css';

type Message = { id: string; role: 'user' | 'bot'; content: string };

export default function GridFinderHelper() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', content: 'Hi! I’m the GridFinder Helper. How can I assist you today?' },
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: crypto.randomUUID?.() ?? String(Date.now()), role: 'user', content: text }]);
    setInput('');
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID?.() ?? String(Date.now()+1), role: 'bot', content: "I'm a placeholder AI response. How can I help further?" },
      ]);
    }, 600);
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <>
<<<<<<< Updated upstream
      <button className={styles.fab} aria-label="Open GridFinder Helper" onClick={() => setOpen((v) => !v)}>
        💬
      </button>
=======
      <button
  className={styles.fab}
  aria-label="Open GridFinder Helper"
  onClick={() => setOpen((v) => !v)}
>
  <img src="/helper.png" alt="" className={styles.fabIcon} />
</button>

>>>>>>> Stashed changes

      {open && (
        <div className={styles.chatbox}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <img src="/tire and wrench.png" alt="Logo" className={styles.logo} />
              <h2 className={styles.title}>GridFinder Helper</h2>
            </div>
            <button className={styles.closeBtn} aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
          </header>

          <div className={styles.messages}>
            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === 'user' ? styles.userMessage : styles.botMessage}>
                {msg.content}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className={styles.inputArea}>
            <input
              type="text"
              placeholder="Write your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button onClick={send}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
