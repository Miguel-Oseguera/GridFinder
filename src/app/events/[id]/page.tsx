import { headers } from "next/headers";
import Link from "next/link";

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

async function getEventsBaseUrl() {
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${proto}://${host}`;
}

async function loadEvent(id: string): Promise<EventItem | null> {
  const base = await getEventsBaseUrl();
  const res = await fetch(`${base}/data/fallback-events.json`, {
    // always show latest dummy data; switch to revalidate when you have a DB
    cache: "no-store",
  });
  if (!res.ok) return null;
  const list = (await res.json()) as EventItem[];
  const decoded = decodeURIComponent(id);
  return list.find((e) => e.id === decoded) ?? null;
}

export default async function EventById({
  params,
}: {
  params: { id: string };
}) {
  const ev = await loadEvent(params.id);

  if (!ev) {
    return (
      <main style={{ padding: 24, color: "#AD2831" }}>
        <h1>Event not found</h1>
        <p>ID: <code>{decodeURIComponent(params.id)}</code></p>
        <p><Link href="/">← Back to map</Link></p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, color: "#AD2831", maxWidth: 720 }}>
      <p><Link href="/">← Back to map</Link></p>
      <h1 style={{ marginTop: 8 }}>{ev.title}</h1>
      <p style={{ marginTop: 4 }}>
        {ev.org ? `${ev.org} · ` : ""}
        {ev.type ?? ""}
        {ev.beginnerFriendly ? " · Beginner-friendly" : ""}
        {ev.sanctioned ? " · Sanctioned" : ""}
      </p>

      {ev.venue && <p style={{ marginTop: 8 }}>{ev.venue}</p>}
      {(ev.city || ev.region || ev.country) && (
        <p>
          {[ev.city, ev.region, ev.country].filter(Boolean).join(", ")}
        </p>
      )}

      {(ev.start || ev.end) && (
        <p style={{ marginTop: 8 }}>
          {ev.start ? fmt(ev.start) : ""}{ev.end ? ` – ${fmt(ev.end)}` : ""}
        </p>
      )}

      {(typeof ev.lat === "number" && typeof ev.lng === "number") && (
        <p style={{ marginTop: 8 }}>
          Coords: {ev.lat.toFixed(4)}, {ev.lng.toFixed(4)}
        </p>
      )}

      {ev.registerUrl && (
        <p style={{ marginTop: 12 }}>
          <a
            href={ev.registerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline", color: "#AD2831" }}
          >
            Register / Event site →
          </a>
        </p>
      )}
    </main>
  );
}
