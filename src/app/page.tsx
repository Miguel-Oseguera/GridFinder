"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Map from "@/components/map";
import GridFinderHelper from "../components/gridFinderHelper";

type SortKey = "dateAsc" | "dateDesc" | "titleAsc";

type EventItem = {
  id: string;
  title: string;
  org?: string;
  type?: string;
  beginnerFriendly?: boolean;
  start?: string;
  end?: string;
  venue?: string;
  lat?: number;
  lng?: number;
  city?: string;
  region?: string;
  country?: string;
  registerUrl?: string;
  sanctioned?: boolean;
  source?: string;
};

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

/** pick N unique random items from arr (or fewer if arr is small) */
function sampleN<T>(arr: T[], n: number): T[] {
  if (!arr.length || n <= 0) return [];
  if (n >= arr.length) return [...arr];
  const out: T[] = [];
  const used = new Set<number>();
  while (out.length < n) {
    const i = Math.floor(Math.random() * arr.length);
    if (!used.has(i)) {
      used.add(i);
      out.push(arr[i]);
    }
  }
  return out;
}

/** ---- Add-to-Calendar helpers ---- */
function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function escapeICS(s: string) {
  return s.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
}
function buildLocation(e: EventItem) {
  return [e.venue, [e.city, e.region, e.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
}
function makeICS(e: EventItem) {
  const now = new Date();
  const dtStart = e.start ? new Date(e.start) : null;
  const dtEnd = e.end
    ? new Date(e.end)
    : dtStart
    ? new Date(dtStart.getTime() + 2 * 60 * 60 * 1000) // default 2h
    : null;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GridFinder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@gridfinder`,
    `DTSTAMP:${icsDate(now)}`,
    dtStart ? `DTSTART:${icsDate(dtStart)}` : undefined,
    dtEnd ? `DTEND:${icsDate(dtEnd)}` : undefined,
    `SUMMARY:${escapeICS(e.title || "Karting Event")}`,
    `DESCRIPTION:${escapeICS([e.org, e.type, e.registerUrl].filter(Boolean).join(" · "))}`,
    `LOCATION:${escapeICS(buildLocation(e))}`,
    e.registerUrl ? `URL:${e.registerUrl}` : undefined,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return lines;
}
function downloadICS(ics: string, filename: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Nicely format type strings like "outdoor_racing" → "Outdoor Racing" */
const prettyType = (t: string) =>
  t
    .trim()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function Home() {
  // ---- Data ----
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- Filters / Sort / Search state ----
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [beginnerOnly, setBeginnerOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dateAsc");
  const [menuOpen, setMenuOpen] = useState(false);

  // NEW: ref for click-away detection
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Load events once (DB-first via /api/events), derive available types
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/events?sort=dateAsc", { cache: "no-store" });
        const events = (await res.json()) as EventItem[];
        if (!mounted) return;
        setAllEvents(Array.isArray(events) ? events : []);

        // robust string-only, trimmed unique types
        const types = Array.from(
          new Set(
            (Array.isArray(events) ? events : [])
              .map((e) => (typeof e?.type === "string" ? e.type.trim() : ""))
              .filter((t): t is string => t.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));

        setAvailableTypes(types);
        setSelectedTypes(types); // show all by default
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleType = (t: string) =>
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  // Badge shows count of active controls
  const activeCount =
    (query.trim() ? 1 : 0) +
    (beginnerOnly ? 1 : 0) +
    (selectedTypes.length !== availableTypes.length ? 1 : 0) +
    (sortKey !== "dateAsc" ? 1 : 0);

  const resetAll = () => {
    setSelectedTypes(availableTypes);
    setBeginnerOnly(false);
    setSortKey("dateAsc");
    setQuery("");
    setMenuOpen(false);
  };

  const allSelected = availableTypes.length > 0 && selectedTypes.length === availableTypes.length;
  const clearAll = () => setSelectedTypes([]);
  const selectAll = () => setSelectedTypes(availableTypes);

  // Filter + sort list
  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const typeSet = new Set(selectedTypes);

    const filtered = allEvents.filter((e) => {
      if (beginnerOnly && !e.beginnerFriendly) return false;
      if (typeSet.size && (!e.type || !typeSet.has(e.type))) return false;
      if (q.length >= 2) {
        const blob = [e.title, e.org, e.type, e.venue, e.city, e.region, e.country]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    const t = (s?: string) => (s ? new Date(s).getTime() : Number.MAX_SAFE_INTEGER);
    if (sortKey === "dateAsc") filtered.sort((a, b) => t(a.start) - t(b.start));
    if (sortKey === "dateDesc") filtered.sort((a, b) => t(b.start) - t(a.start));
    if (sortKey === "titleAsc") filtered.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));

    return filtered;
  }, [allEvents, selectedTypes, beginnerOnly, query, sortKey]);

  // Recommended: from filteredSorted; if none, sample from all
  const recommended = useMemo(() => {
    const pool = filteredSorted.length ? filteredSorted : allEvents;
    return sampleN(pool, 3);
  }, [filteredSorted, allEvents]);

  // NEW: click-away close for the menu, without blocking the map
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <div className="min-h-screen w-full text-white">
      {/* ===== Hero / map strip ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Toolbar */}
        <div className="mb-4 flex items-center gap-3">
          {/* Filters & Sort (pill button + dropdown) */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="inline-flex items-center gap-2 rounded-full bg-white/95 text-[#1b2432]
                         px-4 py-2 border border-black/10 shadow-sm hover:shadow-md
                         focus:outline-none focus:ring-2 focus:ring-[#ad2831]/40 transition"
            >
              {/* filter icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-80">
                <path d="M3 6h18M6 12h12M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="font-semibold">Filters &amp; Sort</span>

              {/* Active-count badge */}
              {activeCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5
                                 text-xs font-semibold rounded-full bg-[#ad2831] text-white px-1.5">
                  {activeCount}
                </span>
              )}

              {/* chevron */}
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className={`ml-1 transition ${menuOpen ? "rotate-180" : ""}`}>
                <path d="M5.8 7.6a1 1 0 0 1 1.4 0L10 10.4l2.8-2.8a1 1 0 1 1 1.4 1.4l-3.5 3.5a1 1 0 0 1-1.4 0L5.8 9a1 1 0 0 1 0-1.4z" />
              </svg>
            </button>

            {menuOpen && (
              <>
                {/* Visual dim overlay that DOES NOT intercept clicks */}
                <div className="fixed inset-0 z-40 pointer-events-none bg-black/10" aria-hidden="true" />
                {/* Dropdown card (receives pointer events) */}
                <div
                  ref={menuRef}
                  role="menu"
                  onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}
                  className="absolute z-50 pointer-events-auto mt-2 w-[340px] rounded-xl bg-white text-[#1b2432]
                             border border-black/10 shadow-lg p-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">Filters</div>
                    <button
                      onClick={resetAll}
                      className="text-xs px-2 py-1 rounded bg-black/5 hover:bg-black/10"
                      title="Reset filters & sort"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Types */}
                  <div className="mb-3">
                    <div className="text-xs font-medium mb-1 opacity-80">Types</div>
                    <div className="flex flex-wrap gap-2">
                      {availableTypes.map((t) => (
                        <label key={t} className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded border border-black/10">
                          <input type="checkbox" checked={selectedTypes.includes(t)} onChange={() => toggleType(t)} />
                          <span>{prettyType(t)}</span>
                        </label>
                      ))}
                      {availableTypes.length === 0 && <span className="text-sm opacity-70">Loading types…</span>}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button className="px-2 py-1 rounded bg-black/5 hover:bg-black/10" onClick={allSelected ? clearAll : selectAll}>
                        {allSelected ? "Clear all" : "Select all"}
                      </button>
                      <label className="ml-auto inline-flex items-center gap-2 bg-white px-2 py-1 rounded border border-black/10">
                        <input type="checkbox" checked={beginnerOnly} onChange={(e) => setBeginnerOnly(e.target.checked)} />
                        Beginner only
                      </label>
                    </div>
                  </div>

                  {/* Sort */}
                  <div className="mb-3">
                    <div className="text-xs font-medium mb-1 opacity-80">Sort</div>
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                      className="w-full rounded-lg border border-black/10 px-2 py-2 bg-white"
                    >
                      <option value="dateAsc">Date (soonest first)</option>
                      <option value="dateDesc">Date (latest first)</option>
                      <option value="titleAsc">Title (A–Z)</option>
                    </select>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end">
                    <button onClick={() => setMenuOpen(false)} className="inline-flex items-center rounded-lg bg-[#1b2432] text-white px-3 py-2">
                      Done
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search (right side) */}
          <div className="ml-auto relative">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events, venues, cities…"
              className="w-[280px] rounded-full bg-white/95 text-[#1b2432]
                         placeholder:text-[#1b2432]/60 pl-9 pr-3 py-2
                         outline-none border border-black/10 focus:border-[#ad2831] focus:ring-2 focus:ring-[#ad2831]/30"
            />
          </div>
        </div>

        {/* Map + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* Map card */}
          <div className="rounded-2xl bg-white text-[#1b2432] p-4 overflow-hidden">
            <div className="sigmar-regular text-xl mb-3" style={{ color: "#ad2831" }}>
              Interactive Map
            </div>
            <div className="relative [transform:none]">
              {/* DB-backed map with same filters */}
              <Map dataUrl="/api/events" filters={{ types: selectedTypes, beginnerOnly, query, sortKey }} />
            </div>
          </div>

          {/* Sidebar: Recommended events w/ Add to Calendar */}
          <aside className="space-y-4">
            {loading ? (
              [0, 1, 2].map((k) => (
                <div key={k} className="rounded-xl bg-white/90 text-[#1b2432] p-4 shadow-sm animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 rounded bg-[var(--gf-red)]/40" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/5 rounded bg-black/10" />
                      <div className="h-3 w-2/5 rounded bg-black/10" />
                      <div className="h-3 w-1/3 rounded bg-black/10" />
                    </div>
                  </div>
                </div>
              ))
            ) : recommended.length === 0 ? (
              <div className="rounded-xl bg-white text-[#1b2432] p-4 shadow-md">
                <div className="text-sm opacity-70">No events found — try widening your filters.</div>
              </div>
            ) : (
              recommended.map((e) => (
                <div key={e.id} className="rounded-xl bg-white text-[#1b2432] p-4 shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 rounded bg-[var(--gf-red)]" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/events/${encodeURIComponent(e.id)}`} className="font-semibold hover:underline break-words">
                        {e.title}
                      </Link>
                      <div className="text-xs opacity-70 mt-0.5">
                        {fmt(e.start)}
                        {e.end ? ` – ${fmt(e.end)}` : ""}
                      </div>
                      <div className="text-xs opacity-70">
                        {[e.venue, [e.city, e.region, e.country].filter(Boolean).join(", ")]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>

                      <div className="mt-2 flex gap-2">
                        {e.registerUrl && (
                          <a
                            href={e.registerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-[var(--gf-red)] text-xs font-semibold hover:underline"
                          >
                            Register
                          </a>
                        )}

                        {/* Add to Calendar */}
                        {e.start && (
                          <button
                            type="button"
                            onClick={() => {
                              const ics = makeICS(e);
                              const safeName = (e.title || "event").replace(/[^\w\-]+/g, "_");
                              downloadICS(ics, `${safeName}.ics`);
                            }}
                            className="inline-flex items-center text-xs font-semibold rounded border border-[var(--gf-red)] px-2 py-1 text-[var(--gf-red)] hover:bg-[var(--gf-red)] hover:text-white transition"
                            title="Add to your calendar (.ics)"
                          >
                            Add to Calendar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </aside>
        </div>
      </section>

      {/* ===== Info section ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        {/* ABOUT */}
        <div className="rounded-xl p-6 md:p-8 mb-1">
          <h2 className="sigmar-regular text-2xl md:text-3xl mb-3">ABOUT GRIDFINDER</h2>
          <p className="text-sm md:text-base leading-relaxed text-white/85">
            GridFinder is a simple way to discover karting near you. Browse a map of events,
            filter by region, date, or series, and open detailed pages with location, schedule,
            and a direct link to register. It’s built by ACM UTSA officers for racers and clubs
            who want less hunting and more seat time.
          </p>
        </div>

        {/* HOW IT WORKS */}
        <div className="rounded-xl p-6 md:p-8 mb-8">
          <h2 className="sigmar-regular text-2xl md:text-3xl mb-3">HOW IT WORKS</h2>
          <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-white/85">
            <li><span className="font-semibold text-white">Search & Filter:</span> address autocomplete + quick filters.</li>
            <li><span className="font-semibold text-white">Explore the Map:</span> click pins to preview events.</li>
            <li><span className="font-semibold text-white">Open Event Details:</span> venue, date/time, overview, register link.</li>
            <li><span className="font-semibold text-white">Beginner Resources:</span> gear/safety and trusted links.</li>
          </ul>
        </div>

        {/* CONTACT */}
        <div className="rounded-xl p-6 md:p-9 mb-9">
          <h2 className="sigmar-regular text-2xl md:text-3xl mb-3">CONTACT US</h2>
          <p className="text-sm md:text-base leading-relaxed text-white/85">
            GridFinder is maintained by <span className="font-semibold">Reese, Savanah, Miguel, and Zander</span> —
            officers of <span className="font-semibold">ACM UTSA</span>. Have feedback, an event to add, or want to help?
            Join our Discord and say hello.
          </p>

          <a
            href="http://discord.acmutsa.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center rounded-lg border border-[var(--gf-red)] px-4 py-2 text-sm font-semibold text-[var(--gf-red)] hover:bg-[var(--gf-red)] hover:text-white transition-colors"
          >
            Join the ACM UTSA Discord
          </a>
        </div>
      </section>

      {/* Floating chatbot */}
      <GridFinderHelper />
    </div>
  );
}
