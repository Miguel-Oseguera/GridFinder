import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ensureKnowledgeLoaded, retrieve } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Message = { role: "user" | "bot"; content: string };

const SYSTEM_INSTRUCTION = `
You are GridFinder’s assistant. Ground answers ONLY in the provided "Website context".
If relevant facts are missing, say briefly that you don’t have that info.

Formatting rules:
- If the user asks about events, reply as a short bullet list:
  - **Title** — {dates}; {venue}, {city}{, region}
    [Details](/events/{id})${" "}•${" "}[Register]({registerUrl, if present})
- If nothing relevant is found, reply: "I couldn’t find that in the site data."
Keep it concise, friendly, and avoid speculation.
`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages: Message[] };
    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "No messages" }, { status: 400 });
    }
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return Response.json({ error: "Missing GOOGLE_API_KEY" }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);

    // Load our in-memory knowledge (events JSON, etc.)
    await ensureKnowledgeLoaded(genAI);

    // Use the latest user message for retrieval
    const userMsg = messages[messages.length - 1]?.content ?? "";
    const hits = await retrieve(genAI, userMsg, 6);

    // Build compact context (the retriever already includes id, title, venue, city, region, country, register)
    const context = hits.map((h, i) => `[#${i + 1}] ${h.url ?? ""}\n${h.text}`).join("\n\n");

    // Map chat history roles
    const history = messages.map((m) => ({
      role: m.role === "bot" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Prepend context before the conversation
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: `Website context:\n${context || "(no relevant context found)"}` }] },
        ...history,
      ],
    });

    const reply = result.response.text();
    return Response.json({ reply });
  } catch (err) {
    console.error("Gemini error:", err);
    return Response.json({ error: "Chat failed" }, { status: 500 });
  }
}
