// src/app/events/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";

type FallbackEvent = { id: string };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function protoFor(host: string) {
  return host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
}

async function getBaseUrl() {
  const host = headers().get("host") ?? "localhost:3000";
  return `${protoFor(host)}://${host}`;
}

async function firstEventId(): Promise<string | null> {
  // 1) Try DB (optional)
  try {
    const mod = (await import("@/lib/prisma").catch(() => null)) as
      | { prisma?: any }
      | null;

    if (mod?.prisma) {
      const row = await mod.prisma.event.findFirst({
        orderBy: { startDate: "asc" }, // NOTE: schema field is startDate
        select: { id: true },
      });
      if (row?.id) return String(row.id);
    }
  } catch {
    // ignore and fall through to API fallback
  }

  // 2) Fallback to API feed
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/events?sort=dateAsc`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;

  const list = (await res.json()) as FallbackEvent[];
  return list?.[0]?.id ?? null;
}

export default async function EventsIndex() {
  const id = await firstEventId();
  redirect(id ? `/events/${encodeURIComponent(id)}` : "/");
}
