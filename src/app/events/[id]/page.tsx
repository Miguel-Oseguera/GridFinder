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
  city?: string;
  region?: string;
  country?: string;
  registerUrl?: string;
  sanctioned?: boolean;
  source?: string;
  lat?: number;
  lng?: number;
};

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

/* ---------- helpers: base URL, data ---------- */
async function getBaseUrl() {
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${proto}://${host}`;
}

async function loadEvent(id: string): Promise<EventItem | null> {
  const decoded = decodeURIComponent(id);

  // Try Prisma (optional)
  try {
    const mod = (await import("@/lib/prisma").catch(() => null)) as { prisma?: any } | null;
    if (mod?.prisma) {
      const row = await mod.prisma.event.findUnique({ where: { id: decoded } });
      if (row) return row as EventItem;
    }
  } catch {}

  // Fallback JSON
  const res = await fetch(`${await getBaseUrl()}/data/fallback-events.json`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;
  const list = (await res.json()) as EventItem[];
  return list.find((e) => e.id === decoded) ?? null;
}

async function loadRecommended(current: EventItem): Promise<EventItem[]> {
  const res = await fetch(`${await getBaseUrl()}/data/fallback-events.json`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return [];
  const all = (await res.json()) as EventItem[];

  const pool: EventItem[] = [];
  const sameType = current.type ? all.filter((e) => e.id !== current.id && e.type === current.type) : [];
  pool.push(...sameType.slice(0, 3));
  for (const e of all) {
    if (pool.length >= 3) break;
    if (e.id !== current.id && !pool.find((x) => x.id === e.id)) pool.push(e);
  }
  return pool.slice(0, 3);
}

/* ---------- helpers: calendar + maps ---------- */
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const escapeICS = (s: string) => s.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

const buildLocation = (e: EventItem) =>
  [e.venue, [e.city, e.region, e.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ");

const mapsUrl = (loc: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;

function makeICS(e: EventItem) {
  const now = new Date();
  const start = e.start ? new Date(e.start) : undefined;
  const end = e.end
    ? new Date(e.end)
    : start
    ? new Date(start.getTime() + 2 * 60 * 60 * 1000) // default 2h
    : undefined;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GridFinder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@gridfinder`,
    `DTSTAMP:${icsDate(now)}`,
    start ? `DTSTART:${icsDate(start)}` : undefined,
    end ? `DTEND:${icsDate(end)}` : undefined,
    `SUMMARY:${escapeICS(e.title || "Karting Event")}`,
    `DESCRIPTION:${escapeICS([e.org, e.type, e.registerUrl].filter(Boolean).join(" · "))}`,
    `LOCATION:${escapeICS(buildLocation(e))}`,
    e.registerUrl ? `URL:${e.registerUrl}` : undefined,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines)}`;
}

const gcalDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
function gcalUrl(e: EventItem) {
  const title = encodeURIComponent(e.title || "Karting Event");
  const details = encodeURIComponent([e.org, e.type, e.registerUrl].filter(Boolean).join(" · "));
  const location = encodeURIComponent(buildLocation(e));
  const start = e.start ? gcalDate(new Date(e.start)) : "";
  const end = e.end
    ? gcalDate(new Date(e.end))
    : e.start
    ? gcalDate(new Date(new Date(e.start).getTime() + 2 * 60 * 60 * 1000))
    : "";
  const dates = start && end ? `${start}/${end}` : "";
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&location=${location}&details=${details}`;
}

export default async function EventById({ params }: { params: { id: string } }) {
  const ev = await loadEvent(params.id);
  if (!ev) return notFound();

  const recs = await loadRecommended(ev);
  const loc = buildLocation(ev);
  const icsHref = makeICS(ev);
  const gHref = ev.start ? gcalUrl(ev) : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 text-white">
      <div className="mb-4">
        <Link href="/events" className="underline text-[var(--gf-red)]">
          ← Back to Events
        </Link>
      </div>

      <div className="rounded-2xl overflow-hidden bg-[#101926]/80 ring-1 ring-white/10">
        <header className="px-5 py-4 bg-[#0b131c] border-b border-white/10">
          <h1 className="sigmar-regular text-2xl md:text-3xl text-[var(--gf-red)]">{ev.title}</h1>
          {(ev.org || ev.type || ev.beginnerFriendly || ev.sanctioned) && (
            <p className="mt-1 text-sm text-white/80">
              {[ev.org, ev.type, ev.beginnerFriendly ? "Beginner-friendly" : "", ev.sanctioned ? "Sanctioned" : ""]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </header>

        <section className="px-5 py-5 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-3">
            {ev.venue && (
              <p>
                <span className="text-[var(--gf-red)] font-semibold">Venue:</span>{" "}
                <a href={mapsUrl(loc)} target="_blank" rel="noopener noreferrer" className="underline">
                  {ev.venue}
                </a>
              </p>
            )}

            {(ev.city || ev.region || ev.country) && (
              <p>
                <span className="text-[var(--gf-red)] font-semibold">Location:</span>{" "}
                <a href={mapsUrl(loc)} target="_blank" rel="noopener noreferrer" className="underline">
                  {[ev.city, ev.region, ev.country].filter(Boolean).join(", ")}
                </a>
              </p>
            )}

            {(ev.start || ev.end) && (
              <p>
                <span className="text-[var(--gf-red)] font-semibold">When:</span>{" "}
                <span>
                  {fmt(ev.start)}
                  {ev.end ? ` – ${fmt(ev.end)}` : ""}
                </span>
              </p>
            )}

            {(typeof ev.lat === "number" && typeof ev.lng === "number") && (
              <p>
                <span className="text-[var(--gf-red)] font-semibold">Coords:</span>{" "}
                <span>
                  {ev.lat.toFixed(4)}, {ev.lng.toFixed(4)}
                </span>
              </p>
            )}

            <div className="pt-2 flex flex-wrap gap-2">
              {ev.registerUrl && (
                <a
                  href={ev.registerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-[var(--gf-red)] hover:opacity-90"
                >
                  Register / Event site →
                </a>
              )}

              {/* Calendar buttons */}
              <a
                href={icsHref}
                download={`${(ev.title || "event").replace(/[^\w\-]+/g, "_")}.ics`}
                className="inline-flex items-center text-xs font-semibold rounded border border-[var(--gf-red)] px-2 py-1 text-[var(--gf-red)] hover:bg-[var(--gf-red)] hover:text-white transition"
              >
                Add to Calendar (.ics)
              </a>
              {gHref && (
                <a
                  href={gHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-semibold rounded border border-[var(--gf-red)] px-2 py-1 text-[var(--gf-red)] hover:bg-[var(--gf-red)] hover:text-white transition"
                >
                  Add to Google Calendar
                </a>
              )}
            </div>
          </div>

          <aside className="rounded-xl bg-white text-[#1b2432] p-4">
            <div className="font-semibold mb-2">Quick facts</div>
            <ul className="text-sm space-y-1">
              {ev.type && (
                <li>
                  <span className="font-medium">Type:</span> {ev.type}
                </li>
              )}
              <li>
                <span className="font-medium">Beginner:</span> {ev.beginnerFriendly ? "Yes" : "No"}
              </li>
              <li>
                <span className="font-medium">Sanctioned:</span> {ev.sanctioned ? "Yes" : "No"}
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
                <div className="text-xs opacity-80">{[r.city, r.region].filter(Boolean).join(", ")}</div>
                {(r.start || r.end) && (
                  <div className="text-xs mt-1">
                    {fmt(r.start)}
                    {r.end ? ` – ${fmt(r.end)}` : ""}
                  </div>
                )}
                <div className="text-xs mt-1">{[r.org, r.type].filter(Boolean).join(" · ")}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
