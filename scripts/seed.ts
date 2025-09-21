// scripts/seed.ts
// scripts/seed.ts
// scripts/seed.ts
//hello
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
// Load environment variables early so Prisma client can read DATABASE_URL
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use this custom import since Prisma Client is generated to src/generated/prisma
const requireFromCwd = createRequire(import.meta.url);
const generatedClientPath = path.join(process.cwd(), 'src', 'generated', 'prisma', 'index.js');
const { PrismaClient } = requireFromCwd(generatedClientPath);

const prisma = new PrismaClient();

// JSON shapes from the provided files
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
  event_id?: string;
  Track_id?: string;
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

async function main() {
  try {
    // Use the ES module compatible __dirname
    const tracksPath = path.join(__dirname, '..', 'data', 'tracks.json');
    const eventsPath = path.join(__dirname, '..', 'data', 'events.json');

    // Check if files exist
    if (!fs.existsSync(tracksPath) || !fs.existsSync(eventsPath)) {
      throw new Error('Data files not found. Please ensure tracks.json and events.json exist in the data directory');
    }

    const rawTracks: RawTrack[] = JSON.parse(fs.readFileSync(tracksPath, 'utf-8'));
    const rawEvents: RawEvent[] = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));

    console.log(`Loaded ${rawTracks.length} tracks and ${rawEvents.length} events`);

    // Group events by Track_id for quick lookup
    const eventsByTrack = new Map<string, RawEvent[]>();
    for (const ev of rawEvents) {
      const tid = ev.Track_id ?? 'unknown';
      if (!eventsByTrack.has(tid)) eventsByTrack.set(tid, []);
      eventsByTrack.get(tid)!.push(ev);
    }

    console.log(`Seeding ${rawTracks.length} tracks...`);

    // Use transactions for better performance
    const transactions = [];

    for (const t of rawTracks) {
      const trackData = {
        title: t.title,
        org: t.org ?? null,
        type: t.type ?? null,
        beginnerFriendly: typeof t.beginnerFriendly === 'boolean' ? t.beginnerFriendly : false,
        venue: t.venue ?? null,
        latitude: typeof t.lat === 'number' ? t.lat : null,
        longitude: typeof t.lng === 'number' ? t.lng : null,
        city: t.city ?? null,
        region: t.region ?? null,
        country: t.country ?? null,
        url: t.registerUrl ?? null,
        sanctioned: typeof t.sanctioned === 'boolean' ? t.sanctioned : false,
        source: t.source ?? null,
        image: t.img ?? null,
      };

      const tid = t.Track_id ?? '';
      const eventsForTrack = eventsByTrack.get(tid) ?? [];

      const eventsCreate = eventsForTrack.map((ev) => ({
        title: ev.title,
        type: ev.type ?? (ev.org ? 'event' : 'unknown'),
        beginnerFriendly: typeof ev.beginnerFriendly === 'boolean' ? ev.beginnerFriendly : false,
        startDate: ev.startDate ? new Date(ev.startDate) : null,
        endDate: ev.endDate ? new Date(ev.endDate) : null,
        img: ev.img ?? null,
        url: ev.url ?? null,
      }));

      const createPayload: any = {
        externalId: t.Track_id ?? null,
        ...trackData,
      };

      if (eventsCreate.length > 0) {
        createPayload.events = { create: eventsCreate };
      }

      if (t.Track_id && t.source) {
        // Upsert with composite key
        transactions.push(
          prisma.track.upsert({
            where: {
              source_externalId: {
                source: t.source,
                externalId: t.Track_id,
              },
            },
            create: createPayload,
            update: {
              ...trackData,
              // Don't update nested events in upsert to avoid duplication
            },
          })
        );
      } else {
        // Create without external ID
        transactions.push(
          prisma.track.create({
            data: createPayload,
          })
        );
      }
    }

    // Execute all operations in a transaction
    await prisma.$transaction(transactions);
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});