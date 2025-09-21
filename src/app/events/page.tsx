import { redirect } from "next/navigation";
import { headers } from "next/headers";

type FallbackEvent = { id: string };

function protoFor(host: string) {
  return host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
}

async function firstEventId(): Promise<string | null> {
  // Try DB first (optional; works if you later add src/lib/prisma.ts)
  try {
    const mod = (await import("@/lib/prisma").catch(() => null)) as { prisma?: any } | null;
    if (mod?.prisma) {
      const row = await mod.prisma.event.findFirst({ orderBy: { start: "asc" }, select: { id: true } });
      if (row?.id) return row.id as string;
    }
  } catch {}

  // Fallback to bundled JSON during scaffolding
  const host = headers().get("host") ?? "localhost:3000";
  const base = `${protoFor(host)}://${host}`;
  const res = await fetch(`${base}/api/events`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;
  const list = (await res.json()) as FallbackEvent[];
  return list?.[0]?.id ?? null;
}

export default async function EventsIndex() {
  const id = await firstEventId();
  redirect(id ? `/events/${encodeURIComponent(id)}` : "/");
}