// src/lib/rag.ts
import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type KBItem = {
  id: string;
  url?: string;
  text: string;
};

type Store = {
  items: KBItem[];
  vectors: number[][];
};

let store: Store | null = null;

// ---- math helpers ----
function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

// ---- embedding helpers ----
async function embed(client: GoogleGenerativeAI, text: string) {
  const model = client.getGenerativeModel({ model: "text-embedding-004" });
  const res = await model.embedContent({ content: { parts: [{ text }] } });
  return res.embedding.values as number[];
}

async function embedBatch(client: GoogleGenerativeAI, texts: string[]) {
  const out: number[][] = [];
  for (const t of texts) out.push(await embed(client, t));
  return out;
}

// ---- public API ----
export async function ensureKnowledgeLoaded(client: GoogleGenerativeAI) {
  if (store) return;

  // 1) Load site data (start with events)
  const eventsPath = path.join(process.cwd(), "public", "data", "fallback-events.json");
  const raw = await fs.readFile(eventsPath, "utf8");
  const events = JSON.parse(raw) as Array<any>;

  // 2) Convert to compact text snippets
  const items: KBItem[] = events.map((e) => {
    const when = [e.start, e.end].filter(Boolean).join(" – ");
    const where = [e.venue, e.city, e.region, e.country].filter(Boolean).join(", ");
    const text = [
      `id: ${e.id}`,
      `title: ${e.title}`,
      e.org ? `org: ${e.org}` : "",
      e.type ? `type: ${e.type}` : "",
      e.beginnerFriendly ? `beginnerFriendly: true` : "",
      when ? `when: ${when}` : "",
      where ? `where: ${where}` : "",
      e.registerUrl ? `register: ${e.registerUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return { id: e.id, url: `/events/${encodeURIComponent(e.id)}`, text };
  });

  // 3) Embed and cache in memory
  const vectors = await embedBatch(client, items.map((i) => i.text));
  store = { items, vectors };
}

export async function retrieve(client: GoogleGenerativeAI, query: string, k = 5) {
  await ensureKnowledgeLoaded(client);
  if (!store || !query?.trim()) return [];
  const qv = await embed(client, query);
  const scored = store.items.map((it, i) => ({ it, score: cosine(qv, store!.vectors[i]) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.it);
}
