// src/app/api/events-search/route.ts
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SortKey = "dateAsc" | "dateDesc" | "titleAsc";
type ApiEvent = {
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

function mapRowToApiEvent(row: any): ApiEvent | null {
  const lat = row.track?.latitude ?? null;
  const lng = row.track?.longitude ?? null;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  return {
    id: row.id,
    title: row.title,
    org: row.track?.org ?? undefined,
    type: row.type ?? undefined,
    beginnerFriendly: row.beginnerFriendly ?? undefined,
    start: row.startDate ? new Date(row.startDate).toISOString() : undefined,
    end: row.endDate ? new Date(row.endDate).toISOString() : undefined,
    venue: row.track?.title ?? undefined,
    lat,
    lng,
    city: row.track?.city ?? undefined,
    region: row.track?.region ?? undefined,
    country: row.track?.country ?? undefined,
    registerUrl: row.url ?? row.track?.url ?? undefined,
    sanctioned: row.track?.sanctioned ?? undefined,
    source: "db",
  };
}

function sortEvents(list: ApiEvent[], sortKey: SortKey) {
  const getTime = (s?: string) => (s ? new Date(s).getTime() : Number.MAX_SAFE_INTEGER);
  if (sortKey === "dateAsc") list.sort((a, b) => getTime(a.start) - getTime(b.start));
  if (sortKey === "dateDesc") list.sort((a, b) => getTime(b.start) - getTime(a.start));
  if (sortKey === "titleAsc") list.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const beginnerOnly = sp.get("beginnerOnly") === "1" || sp.get("beginnerOnly") === "true";
  const types = (sp.get("types") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const q = (sp.get("q") ?? sp.get("query") ?? "").trim();
  const sortKey = (sp.get("sort") as SortKey) || "dateAsc";

  const where: any = { AND: [] as any[] };

  if (beginnerOnly) where.AND.push({ beginnerFriendly: true });
  if (types.length) where.AND.push({ type: { in: types } });

  if (q.length >= 2) {
    const contains = { contains: q, mode: "insensitive" as const };
    where.AND.push({
      OR: [
        { title: contains },
        { org: contains },
        { type: contains },
        { url: contains },
        {
          track: {
            OR: [
              { title: contains },  // venue name
              { org: contains },
              { city: contains },
              { region: contains },
              { country: contains },
            ],
          },
        },
      ],
    });
  }

  try {
    const rows = await prisma.event.findMany({
      where,
      include: { track: true },
      take: 200, // keep it reasonable
    });

    let items = rows.map(mapRowToApiEvent).filter((x): x is ApiEvent => !!x);
    sortEvents(items, sortKey);

    return Response.json(items);
  } catch (err) {
    console.error("[api/events-search] DB error:", err);
    return Response.json([], { status: 200 });
  }
}
