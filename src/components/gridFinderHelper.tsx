'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './gridFinderHelper.module.css';

type Message = { id: string; role: 'user' | 'bot'; content: string };

type EventItem = {
  id: string;
  title: string;
  org?: string;
  type?: string;
  beginnerFriendly?: boolean;
  start?: string;
  end?: string;
  venue?: string;
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
  registerUrl?: string;
  sanctioned?: boolean;
  source?: string;
};

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '');

// ---------- Minimal, safe Markdown → HTML for bot messages ----------
function mdToSafeHtml(md: string) {
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

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

// ---------- Very small “NL → filters” parser ----------
function looksLikeEventQuery(text: string) {
  const q = text.toLowerCase();
  // contains any racing-ish keyword
  return /(event|events|find|show|kart|hpde|race|races|racing|beginner|novice|track|series|any)\b/.test(q);
}

type ParsedFilters = {
  beginnerOnly?: boolean;
  types?: string[];
  q?: string;
  sort?: 'dateAsc' | 'dateDesc' | 'titleAsc';
};

function parseFilters(text: string): ParsedFilters {
  const original = text.trim();
  // normalize: lowercase, strip punctuation (keeps letters, numbers, space, comma)
  const ql = original.toLowerCase().replace(/[^a-z0-9 ,]/g, ' ');

  const out: ParsedFilters = {};

  // beginner?
  if (/\b(beginner|novice)\b/.test(ql)) out.beginnerOnly = true;

  // sort (optional)
  if (/\bnewest\b/.test(ql)) out.sort = 'dateDesc';
  else if (/\btitle\b/.test(ql)) out.sort = 'titleAsc';
  else out.sort = 'dateAsc';

  // explicit type: foo,bar
  const mType = /(type|types)\s*:\s*([a-z ,]+)/i.exec(original);
  if (mType?.[2]) {
    out.types = mType[2]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    // quick guesses from words
    const guess: string[] = [];
    if (/\bhpde\b/.test(ql)) guess.push('HPDE');
    if (/\bkart|karting\b/.test(ql)) guess.push('karting');
    if (/\bclub\b/.test(ql)) guess.push('club racing');
    if (guess.length) out.types = guess;
  }

  // free-text query by dropping obvious control tokens
  const cleaned = ql
    .replace(/\b(find|show|events?|races?|beginner|novice|please|search|for|in|any|type|types|newest|title)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned) out.q = cleaned;

  return out;
}

// ---------- DB-first search with graceful fallback ----------
async function searchEvents(text: string): Promise<EventItem[]> {
  const filters = parseFilters(text);
  const sp = new URLSearchParams();
  if (filters.beginnerOnly) sp.set('beginnerOnly', '1');
  if (filters.types?.length) sp.set('types', filters.types.join(','));
  if (filters.q) sp.set('q', filters.q);
  if (filters.sort) sp.set('sort', filters.sort);
  sp.set('take', '8'); // keep chat responses tight

  // 1) Try dedicated DB search endpoint
  const url1 = `/api/events-search?${sp.toString()}`;
  console.debug('[helper] search URL (primary) →', url1);
  try {
    const res = await fetch(url1, { cache: 'no-store' });
    if (res.ok) {
      const items = (await res.json()) as EventItem[];
      const filtered = (items ?? []).filter(
        (e) => typeof e?.lat === 'number' && typeof e?.lng === 'number' && e?.title
      );
      if (filtered.length) return filtered;
    }
  } catch {
    // ignore and try fallback
  }

  // 2) Fallback to general /api/events (also DB-backed in your app, with demo fallback)
  const url2 = `/api/events?${sp.toString()}`;
  console.debug('[helper] search URL (fallback) →', url2);
  const res2 = await fetch(url2, { cache: 'no-store' });
  if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
  const items2 = (await res2.json()) as EventItem[];
  return (items2 ?? []).filter(
    (e) => typeof e?.lat === 'number' && typeof e?.lng === 'number' && e?.title
  );
}

function resultsToMarkdown(items: EventItem[]): string {
  if (!items.length) return `Sorry — I couldn’t find any matching events.`;

  const top = items.slice(0, 6);
  const lines = top.map((e) => {
    const where = [e.venue, e.city, e.region].filter(Boolean).join(', ');
    const when = e.start || e.end ? `${fmt(e.start)}${e.end ? ' – ' + fmt(e.end) : ''}` : '';
    const detail = `/events/${encodeURIComponent(e.id)}`;
    const register = e.registerUrl ? ` • [Register](${e.registerUrl})` : '';
    return `- **${e.title}**${when ? ` — ${when}` : ''}${where ? `; ${where}` : ''}\n[Details](${detail})${register}`;
  });
  return lines.join('\n');
}

// ----------------------------------------------------------------------

export default function GridFinderHelper() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      content:
        'Hi! I’m the GridFinder Helper. Ask me anything — try: **beginner karting in Texas** or **type: hpde austin newest**.',
    },
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
      if (looksLikeEventQuery(text)) {
        // ---- DB-backed path via /api/events-search (fallback to /api/events)
        const items = await searchEvents(text);
        const md = resultsToMarkdown(items);
        const botMsg: Message = {
          id: crypto.randomUUID?.() ?? String(Date.now() + 1),
          role: 'bot',
          content: md,
        };
        setMessages((m) => [...m, botMsg]);
      } else {
        // ---- fall back to your Gemini chat endpoint
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
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID?.() ?? String(Date.now() + 2),
          role: 'bot',
          content: 'Something went wrong fetching results. Please try again in a moment.',
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
                  className={`${styles.botMessage} gf-bot-block`}
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
              placeholder="Ask: beginner karting in Texas…"
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
