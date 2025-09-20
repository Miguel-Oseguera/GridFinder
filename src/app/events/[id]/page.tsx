import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

type EventDTO = {
  id: string;
  title: string;
  description?: string;
  org?: string;
  type?: string;
  beginnerFriendly?: boolean;
  start?: string | Date;
  end?: string | Date;
  venue?: string;
  city?: string;
  region?: string;
  country?: string;
  registerUrl?: string;
};

const fmt = (v?: string | Date) =>
  v ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

function protoFor(host: string) {
  return host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
}
async function baseUrl() {
  const host = headers().get("host") ?? "localhost:3000";
  return `${protoFor(host)}://${host}`;
}

async function getEvent(id: string): Promise<EventDTO | null> {
  const decoded = decodeURIComponent(id);

  // Optional DB
  try {
    const mod = (await import("@/lib/prisma").catch(() => null)) as { prisma?: any } | null;
    if (mod?.prisma) {
      const ev = await mod.prisma.event.findUnique({ where: { id: decoded } });
      if (ev) return ev as EventDTO;
    }
  } catch {}

  // Fallback JSON
  const res = await fetch(`${await baseUrl()}/data/fallback-events.json`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;
  const list = (await res.json()) as EventDTO[];
  return list.find((e) => e.id === decoded) ?? null;
}

async function getRecommended(currentId: string): Promise<Array<Pick<EventDTO, "id"|"title">>> {
  // Simple JSON-based “recommended” (first 3 others). Replace with DB query later.
  try {
    const res = await fetch(`${await baseUrl()}/data/fallback-events.json`, { cache: "no-store" });
    if (!res.ok) return [];
    const list = (await res.json()) as EventDTO[];
    return list.filter(e => e.id !== currentId).slice(0, 3).map(e => ({ id: e.id, title: e.title }));
  } catch {
    return [];
  }
}

export default async function EventById({ params }: { params: { id: string } }) {
  const event = await getEvent(params.id);
  if (!event) return notFound();
  const rec = await getRecommended(event.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 text-white">
      {/* Back link */}
      <div className="mb-5">
        <Link href="/events" className="text-[var(--gf-red)] hover:underline">
          ← Back to Events
        </Link>
      </div>

      {/* Grid: left column media + recommended, right column content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[340px_1fr]">
        {/* LEFT */}
        <aside>
          {/* Media box with red border, rounded corners, like the mock */}
          <div className="rounded-xl border-2 border-[var(--gf-red)] bg-transparent h-[200px] w-full" />
          {/* Recommended list */}
          <div className="mt-5">
            <div className="text-[var(--gf-red)] font-semibold mb-2">Recommended Events:</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {rec.length ? (
                rec.map(e => (
                  <li key={e.id}>
                    <Link href={`/events/${encodeURIComponent(e.id)}`} className="hover:underline">
                      {e.title}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li>Coming soon</li>
                </>
              )}
            </ul>
          </div>
        </aside>

        {/* RIGHT */}
        <section>
          {/* Bracketed Sigmar title */}
          <h1 className="sigmar-regular text-4xl mb-6">[{event.title}]</h1>

          {/* Two short paragraphs (overview) */}
          {event.description && (
            <>
              <p className="text-white/85 leading-relaxed">
                {event.description}
              </p>
              {/* Optional second paragraph: duplicate/trim if you only have one description field */}
              {/* <p className="text-white/85 leading-relaxed mt-4">{event.description}</p> */}
            </>
          )}

          {/* Meta block with red labels */}
          <div className="mt-6 space-y-2 text-sm md:text-base">
            {event.venue && (
              <p>
                <span className="text-[var(--gf-red)] font-semibold">Location:</span>{" "}
                <span>{event.venue}</span>
              </p>
            )}

            {(event.city || event.region || event.country) && (
              <p>
                <span className="text-[var(--gf-red)] font-semibold">Area:</span>{" "}
                <span>{[event.city, event.region, event.country].filter(Boolean).join(", ")}</span>
              </p>
            )}

            {(event.start || event.end) && (
              <p>
                <span className="text-[var(--gf-red)] font-semibold">Date &amp; Time:</span>{" "}
                <span>
                  {fmt(event.start)}
                  {event.end ? ` – ${fmt(event.end)}` : ""}
                </span>
              </p>
            )}

            {(event.org || event.type) && (
              <p>
                <span className="text-[var(--gf-red)] font-semibold">Other info:</span>{" "}
                <span>{[event.org, event.type, event.beginnerFriendly ? "Beginner-friendly" : "", event.sanctioned ? "Sanctioned" : ""]
                  .filter(Boolean).join(" · ")}</span>
              </p>
            )}
          </div>

          {/* Red underlined CTA link at bottom */}
          {event.registerUrl && (
            <p className="mt-6">
              <a
                href={event.registerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-[var(--gf-red)] hover:opacity-90"
              >
                Click here for more details
              </a>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
