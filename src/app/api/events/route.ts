// src/app/api/events/route.ts
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

const toBool = (v: string | null) => v === "1" || v === "true";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const beginnerOnly = toBool(sp.get("beginnerOnly"));
  const types = (sp.get("types") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const q = (sp.get("q") ?? sp.get("query") ?? "").trim(); // e.g. "daytona"
  const sortKey = (sp.get("sort") as SortKey) || "dateAsc";

  const orderBy =
    sortKey === "dateDesc"
      ? { startDate: "desc" as const }
      : sortKey === "titleAsc"
      ? { title: "asc" as const }
      : { startDate: "asc" as const };

  try {
    // Build Prisma where with DB-side search
    const where: any = {};
    if (beginnerOnly) where.beginnerFriendly = true;
    if (types.length) where.type = { in: types };

    if (q) {
      where.OR = [
        // Event fields
        { title: { contains: q, mode: "insensitive" } },
        { type: { contains: q, mode: "insensitive" } },
        { url: { contains: q, mode: "insensitive" } },
        // Track/venue & location
        {
          track: {
            OR: [
              { title: { contains: q, mode: "insensitive" } },   // venue
              { org: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { region: { contains: q, mode: "insensitive" } },
              { country: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const rows = await prisma.event.findMany({
      where,
      include: { track: true },
      orderBy,
      take: 200, // protect payload
    });

    const items = rows
      .map(mapRowToApiEvent)
      .filter((x): x is ApiEvent => !!x);

    return Response.json(items);
  } catch (err) {
    console.error("[api/events] DB error, using fallback:", err);
    const res = await fetch(new URL("/data/fallback-events.json", req.url), {
      cache: "no-store",
    });
    const demo = await res.json();
    return Response.json(demo);
  }
}
