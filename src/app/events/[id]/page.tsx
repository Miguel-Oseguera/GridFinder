import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

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

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "");

/** Build an absolute base URL that works in dev (http://localhost) and prod (https) */
async function getBaseUrl() {
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${proto}://${host}`;
}

/** Try Prisma first; if missing or not found, read from the JSON file by ID */
async function loadEvent(id: string): Promise<EventItem | null> {
  const decoded = decodeURIComponent(id);

  // 1) Optional DB (Prisma) — safe dynamic import
  try {
    const mod = (await import("@/lib/prisma").catch(() => null)) as
      | { prisma?: any }
      | null;
    if (mod?.prisma) {
      const ev = await mod.prisma.event.findUnique({ where: { id: decoded } });
      if (ev) return ev as EventItem;
    }
  } catch {
    // ignore and fall back to JSON
  }

  // 2) JSON fallback
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/events`, {
    cache: "no-store", // always latest dummy data
  });
  if (!res.ok) return null;
  const list = (await res.json()) as EventItem[];
  return list.find((e) => e.id === decoded) ?? null;
}

/** Load a few “recommended” events from JSON (exclude current id). */
async function loadRecommended(current: EventItem): Promise<EventItem[]> {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/events`, { cache: "no-store" });
  if (!res.ok) return [];
  const all = (await res.json()) as EventItem[];

  // Prefer same type; if not enough, fill from same region; else anything.
  const sameType = all.filter((e) => e.id !== current.id && e.type && e.type === current.type);
  if (sameType.length >= 3) return sameType.slice(0, 3);

  const pool = new Map<string, EventItem>();
  sameType.forEach((e) => pool.set(e.id, e));

  const sameRegion = all.filter(
    (e) =>
      e.id !== current.id &&
      !pool.has(e.id) &&
      e.region &&
      current.region &&
      e.region === current.region
  );
  sameRegion.slice(0, 3 - pool.size).forEach((e) => pool.set(e.id, e));

  // Fill remaining slots
  for (const e of all) {
    if (e.id === current.id) continue;
    if (pool.size >= 3) break;
    if (!pool.has(e.id)) pool.set(e.id, e);
  }

  return Array.from(pool.values()).slice(0, 3);
}

export default async function EventById({
  params,
}: {
  params: { id: string };
}) {
  const ev = await loadEvent(params.id);
  if (!ev) notFound();

  const recs = await loadRecommended(ev);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 text-white">
      <div className="mb-4">
        <Link href="/" className="underline text-[var(--gf-red)]">
          ← Back to map
        </Link>
      </div>

      <div className="rounded-2xl overflow-hidden bg-[#101926]/80 ring-1 ring-white/10">
        {/* Header / Title */}
        <header className="px-5 py-4 bg-[#0b131c] border-b border-white/10">
          <h1 className="sigmar-regular text-2xl md:text-3xl text-[var(--gf-red)]">
            {ev.title}
          </h1>
          {(ev.org || ev.type || ev.beginnerFriendly || ev.sanctioned) && (
            <p className="mt-1 text-sm text-white/80">
              {[ev.org, ev.type, ev.beginnerFriendly ? "Beginner-friendly" : "", ev.sanctioned ? "Sanctioned" : ""]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </header>

        {/* Body */}
        <section className="px-5 py-5 grid gap-6 md:grid-cols-3">
          {/* Left detail column */}
          <div className="md:col-span-2 space-y-3">
            {ev.venue && (
              <p>
                <span className="text-[var(--gf-red)] font-semibold">
                  Venue:
                </span>{" "}
                <span>{ev.venue}</span>
              </p>
            )}

            {(ev.city || ev.region || ev.country) && (
              <p>
                <span className="text-[var(--gf-red)] font-semibold">
                  Location:
                </span>{" "}
                <span>
                  {[ev.city, ev.region, ev.country].filter(Boolean).join(", ")}
                </span>
              </p>
            )}

            {(ev.start || ev.end) && (
              <p>
                <span className="text-[var(--gf-red)] font-semibold">
                  When:
                </span>{" "}
                <span>
                  {ev.start ? fmt(ev.start) : ""}
                  {ev.end ? ` – ${fmt(ev.end)}` : ""}
                </span>
              </p>
            )}

            {(typeof ev.lat === "number" && typeof ev.lng === "number") && (
              <p>
                <span className="text-[var(--gf-red)] font-semibold">
                  Coords:
                </span>{" "}
                <span>
                  {ev.lat.toFixed(4)}, {ev.lng.toFixed(4)}
                </span>
              </p>
            )}

            {ev.registerUrl && (
              <p className="pt-2">
                <a
                  href={ev.registerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-[var(--gf-red)] hover:opacity-90"
                >
                  Register / Event site →
                </a>
              </p>
            )}
          </div>

          {/* Right “card” with quick facts */}
          <aside className="rounded-xl bg-white text-[#1b2432] p-4">
            <div className="font-semibold mb-2">Quick facts</div>
            <ul className="text-sm space-y-1">
              {ev.type && (
                <li>
                  <span className="font-medium">Type:</span> {ev.type}
                </li>
              )}
              <li>
                <span className="font-medium">Beginner:</span>{" "}
                {ev.beginnerFriendly ? "Yes" : "No"}
              </li>
              <li>
                <span className="font-medium">Sanctioned:</span>{" "}
                {ev.sanctioned ? "Yes" : "No"}
              </li>
              {ev.org && (
                <li>
                  <span className="font-medium">Organizer:</span> {ev.org}
                </li>
              )}
              {ev.source && (
                <li>
                  <span className="font-medium">Source:</span> {ev.source}
                </li>
              )}
            </ul>
          </aside>
        </section>
      </div>

      {/* Recommended */}
      {recs.length > 0 && (
        <section className="mt-8">
          <h2 className="sigmar-regular text-xl mb-3">Recommended events</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {recs.map((r) => (
              <Link
                key={r.id}
                href={`/events/${encodeURIComponent(r.id)}`}
                className="block rounded-xl bg-white text-[#1b2432] p-4 hover:shadow-md transition-shadow"
              >
                <div className="font-semibold">{r.title}</div>
                <div className="text-xs opacity-80">
                  {[r.city, r.region].filter(Boolean).join(", ")}
                </div>
                {(r.start || r.end) && (
                  <div className="text-xs mt-1">
                    {r.start ? fmt(r.start) : ""}
                    {r.end ? ` – ${fmt(r.end)}` : ""}
                  </div>
                )}
                <div className="text-xs mt-1">
                  {[r.org, r.type].filter(Boolean).join(" · ")}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
