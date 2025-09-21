"use client";

import { useEffect, useState } from "react";
import GridFinderHelper from "../components/gridFinderHelper";
import Map from "@/components/map";

type SortKey = "dateAsc" | "dateDesc" | "titleAsc";

export default function Home() {
  // ---- Filters / Sort / Search state ----
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [beginnerOnly, setBeginnerOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dateAsc");
  const [menuOpen, setMenuOpen] = useState(false);

  // Load distinct event types from your dataset
  useEffect(() => {
    // load distinct event types from server (instead of the local JSON)
    fetch('/api/events')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load events');
        return r.json();
      })
      .then((events: Array<{ type?: string }>) => {
        const types = Array.from(
          new Set(events.map((e) => e.type).filter(Boolean) as string[])
        ).sort();
        setAvailableTypes(types);
        setSelectedTypes(types); // show all by default
      })
      .catch(() => {
        // fallback if server fails
        const types = ['karting', 'HPDE', 'club racing'];
        setAvailableTypes(types);
        setSelectedTypes(types);
      });
  }, []);

  const toggleType = (t: string) =>
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );

  // Badge shows count of active controls (query, beginnerOnly, types subset, non-default sort)
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

  const allSelected =
    availableTypes.length > 0 && selectedTypes.length === availableTypes.length;
  const clearAll = () => setSelectedTypes([]);
  const selectAll = () => setSelectedTypes(availableTypes);

  return (
    <div className="min-h-screen w-full text-white">
      {/* ===== Hero / map strip ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Toolbar: left = Filters & Sort dropdown, right = Search */}
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="opacity-80"
              >
                <path
                  d="M3 6h18M6 12h12M10 18h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="font-semibold">Filters &amp; Sort</span>

              {/* Active-count badge */}
              {activeCount > 0 && (
                <span
                  className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5
                             text-xs font-semibold rounded-full bg-[#ad2831] text-white px-1.5"
                >
                  {activeCount}
                </span>
              )}

              {/* chevron */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`ml-1 transition ${menuOpen ? "rotate-180" : ""}`}
              >
                <path d="M5.8 7.6a1 1 0 0 1 1.4 0L10 10.4l2.8-2.8a1 1 0 1 1 1.4 1.4l-3.5 3.5a1 1 0 0 1-1.4 0L5.8 9a1 1 0 0 1 0-1.4z" />
              </svg>
            </button>

            {menuOpen && (
              <>
                {/* Click-away backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                {/* Dropdown card */}
                <div
                  role="menu"
                  onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}
                  className="absolute z-50 mt-2 w-[340px] rounded-xl bg-white text-[#1b2432]
                             border border-black/10 shadow-lg p-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">Filters</div>
                    <button
                      onClick={resetAll}
                      className="text-xs px-2 py-1 rounded bg_black/5 hover:bg-black/10"
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
                        <label
                          key={t}
                          className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded border border-black/10"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTypes.includes(t)}
                            onChange={() => toggleType(t)}
                          />
                          <span className="capitalize">{t}</span>
                        </label>
                      ))}
                      {availableTypes.length === 0 && (
                        <span className="text-sm opacity-70">Loading types…</span>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        className="px-2 py-1 rounded bg-black/5 hover:bg-black/10"
                        onClick={
                          selectedTypes.length === availableTypes.length
                            ? clearAll
                            : selectAll
                        }
                      >
                        {selectedTypes.length === availableTypes.length
                          ? "Clear all"
                          : "Select all"}
                      </button>
                      <label className="ml-auto inline-flex items-center gap-2 bg-white px-2 py-1 rounded border border-black/10">
                        <input
                          type="checkbox"
                          checked={beginnerOnly}
                          onChange={(e) => setBeginnerOnly(e.target.checked)}
                        />
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
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="inline-flex items-center rounded-lg bg-[#1b2432] text-white px-3 py-2"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search (right side) */}
          <div className="ml-auto relative">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path
                d="M20 20l-3.2-3.2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
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
            <div
              className="sigmar-regular text-xl mb-3"
              style={{ color: "#ad2831" }}
            >
              Interactive Map
            </div>
            <div className="relative [transform:none]">
              <Map
                dataUrl="/api/events"
                filters={{ types: selectedTypes, beginnerOnly, query, sortKey }}
              />
            </div>
          </div>

          {/* Sidebar cards (placeholder) */}
          <aside className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl bg-white text-[#1b2432] p-4 shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded bg-[var(--gf-red)]" />
                  <div className="flex-1">
                    <div className="font-semibold">Name of Event</div>
                    <div className="text-xs opacity-70">Date &amp; Time</div>
                    <div className="text-xs opacity-70">Location</div>
                    <button className="mt-2 inline-flex items-center text-[var(--gf-red)] text-sm font-semibold hover:underline">
                      Register
                    </button>
                  </div>
                  <div className="h-6 w-6 rounded bg-black/10" />
                </div>
              </div>
            ))}
          </aside>
        </div>
      </section>

      {/* ===== Content sections (restored) ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="bg-[#1b2432] rounded-xl p-6 md:p-8 mb-8">
          <h2 className="sigmar-regular text-2xl md:text-3xl mb-3">ABOUT GRIDFINDER</h2>
          <p className="text-sm md:text-base leading-relaxed text:white/85">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.
          </p>
        </div>

        <div className="bg-[#1b2432] rounded-xl p-6 md:p-8 mb-8">
          <h2 className="sigmar-regular text-2xl md:text-3xl mb-3">BLAHBLAHBlAH</h2>
          <p className="text-sm md:text-base leading-relaxed text:white/85">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit.
          </p>
        </div>

        <div className="bg-[#1b2432] rounded-xl p-6 md:p-8 mb-10">
          <h2 className="sigmar-regular text-2xl md:text-3xl mb-3">CONTACT US</h2>
          <p className="text-sm md:text-base leading-relaxed text:white/85">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
          </p>
        </div>
      </section>

      {/* ===== Footer (restored) ===== */}
      <footer className="w-full bg-[var(--gf-header)] text-[#1b2432]">
        <div className="mx-auto w-full max-w-6xl px-4 py-3 text-center text-sm opacity-80">
          Blah blah blah footer info
        </div>
      </footer>

      {/* Floating chatbot */}
      <GridFinderHelper />
    </div>
  );
}
