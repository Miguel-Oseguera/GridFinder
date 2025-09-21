'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type EventItem = {
  id: string;
  title: string;
  org?: string;
  type?: string;
  beginnerFriendly?: boolean;
  start?: string;
  end?: string;
  venue?: string;
  city?: string;
  region?: string;
  country?: string;
  registerUrl?: string;
};

type SortKey = 'dateAsc' | 'dateDesc' | 'titleAsc';

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

export default function EventsIndexPage() {
  const [all, setAll] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // controls
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('dateAsc');
  const [beginnerOnly, setBeginnerOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/data/fallback-events.json', { cache: 'no-store' });
        const json = (await res.json()) as EventItem[];
        if (mounted) setAll(json);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const types = useMemo(() => {
    const s = new Set<string>();
    all.forEach(e => e.type && s.add(e.type));
    return Array.from(s).sort();
  }, [all]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selected = new Set(typeFilter);

    let list = all.filter(e => {
      if (beginnerOnly && !e.beginnerFriendly) return false;
      if (selected.size && (!e.type || !selected.has(e.type))) return false;
      if (q.length >= 2) {
        const blob = [e.title, e.org, e.type, e.venue, e.city, e.region, e.country]
          .filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    const t = (s?: string) => (s ? new Date(s).getTime() : Number.MAX_SAFE_INTEGER);
    if (sortKey === 'dateAsc') list.sort((a,b) => t(a.start) - t(b.start));
    if (sortKey === 'dateDesc') list.sort((a,b) => t(b.start) - t(a.start));
    if (sortKey === 'titleAsc') list.sort((a,b) => (a.title ?? '').localeCompare(b.title ?? ''));

    return list;
  }, [all, query, sortKey, beginnerOnly, typeFilter]);

  const toggleType = (t: string) =>
    setTypeFilter(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 text-white">
      {/* toolbar */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          className="w-full rounded-xl bg-white/95 text-[#1b2432] placeholder:text-[#1b2432]/60 px-4 py-2 outline-none border border-white/40 focus:border-[var(--gf-red)]"
          placeholder="Search events, venues, cities…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {/* type filter */}
          <div className="relative">
            <details>
              <summary className="cursor-pointer select-none rounded-lg bg-white text-[#1b2432] px-3 py-1 border border-black/10">
                Type
              </summary>
              <div className="absolute mt-1 min-w-[220px] rounded-lg bg-white text-[#1b2432] p-2 shadow-lg z-10 border border-black/10">
                {types.length ? (
                  <ul className="max-h-60 overflow-auto">
                    {types.map((t) => (
                      <li key={t} className="flex items-center gap-2 py-1">
                        <input id={`type-${t}`} type="checkbox"
                          checked={typeFilter.includes(t)} onChange={() => toggleType(t)} />
                        <label htmlFor={`type-${t}`}>{t}</label>
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-sm opacity-70">No types yet</div>}
                <div className="pt-2 flex justify-end">
                  <button className="text-xs underline" onClick={() => setTypeFilter([])}>Clear</button>
                </div>
              </div>
            </details>
          </div>

          {/* beginner-only */}
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={beginnerOnly} onChange={e => setBeginnerOnly(e.target.checked)} />
            <span>Beginner-friendly</span>
          </label>

          {/* sort */}
          <div className="flex items-center gap-2">
            <span className="opacity-80">Sort by:</span>
            <select
              className="rounded-lg bg-white text-[#1b2432] px-2 py-1 border border-black/10"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="dateAsc">Date (soonest)</option>
              <option value="dateDesc">Date (latest)</option>
              <option value="titleAsc">Name (A→Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* list */}
      <div className="rounded-2xl bg-white text-[#1b2432] p-3 md:p-4">
        <div className="mb-2 flex justify-between items-center rounded-lg bg-[#e7e0de] px-3 py-2 text-sm">
          <span className="opacity-70">Search your region…</span>
          <div className="flex items-center gap-4">
            <span>
              <span className="opacity-60">Filter by:</span>{' '}
              <span className="font-semibold text-[var(--gf-red)]">
                {beginnerOnly || typeFilter.length ? 'Active' : 'None'}
              </span>
            </span>
            <span>
              <span className="opacity-60">Sort by:</span>{' '}
              <span className="font-semibold text-[var(--gf-red)]">
                {sortKey === 'titleAsc' ? 'Name' : sortKey === 'dateDesc' ? 'Date ↓' : 'Date ↑'}
              </span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-sm opacity-70">Loading events…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm opacity-70">No events match your filters.</div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'rgba(173,40,49,0.35)' }}>
            {items.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded bg-[var(--gf-red)]/90" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/events/${encodeURIComponent(e.id)}`} className="font-semibold hover:underline break-words">
                      {e.title}
                    </Link>
                    <div className="text-xs opacity-70 mt-0.5">
                      {fmt(e.start)}{e.end ? ` – ${fmt(e.end)}` : ''}
                    </div>
                    <div className="text-xs opacity-70">
                      {[e.venue, [e.city, e.region, e.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                    </div>
                    {e.registerUrl && (
                      <a href={e.registerUrl} target="_blank" rel="noopener noreferrer"
                         className="mt-1 inline-flex text-[var(--gf-red)] text-xs font-semibold hover:underline">
                        Register
                      </a>
                    )}
                  </div>
                  <div className="h-6 w-6 shrink-0 rounded border border-[var(--gf-red)] text-[var(--gf-red)] grid place-items-center text-xs">
                    🗓
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
