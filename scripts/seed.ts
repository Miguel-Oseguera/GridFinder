// scripts/seed.ts
import "dotenv/config";
import { readFile } from "node:fs/promises";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the generated Prisma client at src/generated/prisma (per your schema output)
const requireFromCwd = createRequire(import.meta.url);
const generatedClientPath = path.join(process.cwd(), "src", "generated", "prisma", "index.js");
const { PrismaClient } = requireFromCwd(generatedClientPath);

const prisma = new PrismaClient();

// --- Shapes from your JSON files ---
interface RawTrack {
  Track_id?: string;
  title: string;
  org?: string;
  type?: string;
  beginnerFriendly?: boolean;
  venue?: string;
  lat?: number;
  lng?: number;
  city?: string;
  region?: string;
  country?: string;
  registerUrl?: string;
  sanctioned?: boolean;
  source?: string;
  img?: string;
}

interface RawEvent {
  event_id?: string;   // unique per event if possible
  Track_id?: string;   // to associate back to track
  title: string;
  org?: string;
  type?: string;
  beginnerFriendly?: boolean;
  url?: string;
  startDate?: string | null;
  endDate?: string | null;
  time?: string | null;
  img?: string;
}

// Build a stable external ID for events if event_id is missing
function buildEventExternalId(trackId?: string, ev?: RawEvent) {
  const base = ev?.event_id?.trim();
  if (base) return base; // prefer provided event_id
  // fallback: derive from track + title + dates (keeps it deterministic)
  const t = trackId ?? "unknown-track";
  const titleSlug = (ev?.title ?? "untitled").toLowerCase().replace(/\s+/g, "-").slice(0, 80);
  const sd = ev?.startDate ?? "";
  const ed = ev?.endDate ?? "";
  return `${t}:${titleSlug}:${sd}:${ed}`;
}

async function main() {
  // --- Locate files relative to scripts/ ---
  const tracksPath = path.join(__dirname, "..", "data", "tracks.json");
  const eventsPath = path.join(__dirname, "..", "data", "events.json");

  if (!fs.existsSync(tracksPath) || !fs.existsSync(eventsPath)) {
    throw new Error("Data files not found. Ensure data/tracks.json and data/events.json exist.");
  }

  const rawTracks: RawTrack[] = JSON.parse(await readFile(tracksPath, "utf8"));
  const rawEvents: RawEvent[] = JSON.parse(await readFile(eventsPath, "utf8"));

  console.log(`Loaded ${rawTracks.length} tracks and ${rawEvents.length} events`);

  // Group events by Track_id
  const eventsByTrack = new Map<string, RawEvent[]>();
  for (const ev of rawEvents) {
    const tid = ev.Track_id ?? "unknown";
    if (!eventsByTrack.has(tid)) eventsByTrack.set(tid, []);
    eventsByTrack.get(tid)!.push(ev);
  }

  let tracksCreated = 0;
  let tracksUpserted = 0;
  let eventsUpserted = 0;

  // Process sequentially so we can use returned track IDs for event linkage
  for (const t of rawTracks) {
    const trackData = {
      title: t.title,
      org: t.org ?? null,
      type: t.type ?? null,
      beginnerFriendly: typeof t.beginnerFriendly === "boolean" ? t.beginnerFriendly : false,
      venue: t.venue ?? null,
      latitude: typeof t.lat === "number" ? t.lat : null,
      longitude: typeof t.lng === "number" ? t.lng : null,
      city: t.city ?? null,
      region: t.region ?? null,
      country: t.country ?? null,
      url: t.registerUrl ?? null,
      sanctioned: typeof t.sanctioned === "boolean" ? t.sanctioned : false,
      source: t.source ?? null,
      image: t.img ?? null,
    };

    // Upsert Track using your composite unique [source, externalId] when possible
    let trackRecord;
    if (t.Track_id && t.source) {
      trackRecord = await prisma.track.upsert({
        where: { source_externalId: { source: t.source, externalId: t.Track_id } },
        create: { externalId: t.Track_id, ...trackData },
        update: trackData,
      });
      tracksUpserted++;
    } else {
      // No composite identity → create a new track
      trackRecord = await prisma.track.create({
        data: { externalId: t.Track_id ?? null, ...trackData },
      });
      tracksCreated++;
    }

    // Upsert Events for this track (works whether track is new or existing)
    const eventsForTrack = eventsByTrack.get(t.Track_id ?? "") ?? [];
    for (const ev of eventsForTrack) {
      const externalId = buildEventExternalId(t.Track_id, ev);

      await prisma.event.upsert({
        where: { externalId }, // UNIQUE on Event.externalId
        update: {
          trackId: trackRecord.id,
          title: ev.title,
          type: ev.type ?? "event",
          beginnerFriendly: !!ev.beginnerFriendly,
          startDate: ev.startDate ? new Date(ev.startDate) : null,
          endDate: ev.endDate ? new Date(ev.endDate) : null,
          time: ev.time ?? null,
          img: ev.img ?? null,
          url: ev.url ?? null,
        },
        create: {
          externalId,
          trackId: trackRecord.id,
          title: ev.title,
          type: ev.type ?? "event",
          beginnerFriendly: !!ev.beginnerFriendly,
          startDate: ev.startDate ? new Date(ev.startDate) : null,
          endDate: ev.endDate ? new Date(ev.endDate) : null,
          time: ev.time ?? null,
          img: ev.img ?? null,
          url: ev.url ?? null,
        },
      });

      eventsUpserted++;
    }
  }

  console.log(
    `Seed complete: ${tracksCreated} tracks created, ${tracksUpserted} tracks upserted, ${eventsUpserted} events upserted`
  );
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
