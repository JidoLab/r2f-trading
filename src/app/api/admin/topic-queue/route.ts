import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { loadQueue, addToQueue, removeFromQueue } from "@/lib/topic-queue";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET — list the current queue (pending first, then used)
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const queue = await loadQueue();
  const pending = queue.filter((q) => !q.used).reverse();
  const used = queue.filter((q) => q.used).reverse().slice(0, 30);
  return NextResponse.json({ pending, used, total: queue.length });
}

// POST — { action: "add", text } | { action: "generate" }
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === "mine-gsc") {
    // Trigger the GSC miner now (instead of waiting for the weekly cron); it
    // fetches page-2 queries and appends suggestions to this same queue.
    try {
      const base = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://r2ftrading.com";
      const res = await fetch(`${base}/api/cron/content-from-search`, {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ ok: res.ok, result: data });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Mine failed" },
        { status: 500 }
      );
    }
  }

  if (action === "generate") {
    // Trigger the daily generator now; it consumes the top queued item.
    try {
      const base = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://r2ftrading.com";
      const res = await fetch(`${base}/api/cron/generate-post`, {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ ok: res.ok, result: data });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Generate failed" },
        { status: 500 }
      );
    }
  }

  if (action === "add") {
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });

    // Accept either raw questions/keywords (one per line) or pasted GSC rows
    // like: "why do i keep failing ftmo  123  14.2"  — we only need the query
    // text; strip trailing numbers/tabs.
    const lines = text
      .split("\n")
      .map((l: string) => l.replace(/[\t,]+\d[\d.\s%]*$/, "").trim())
      .filter((l: string) => l.length > 3)
      .slice(0, 40);

    if (lines.length === 0) {
      return NextResponse.json({ error: "No usable questions found" }, { status: 400 });
    }

    const anthropic = new Anthropic();
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: `You are an SEO content strategist for R2F Trading, an ICT/forex trading coaching brand run by Harvest, a coach with 10+ years of experience. The audience is the STRUGGLING trader (6 months to 3 years in, has blown accounts, looking for the missing piece).

Below are real search queries / questions. For each (or each cluster of near-duplicates), produce a blog post idea that R2F could rank for and that fits the brand.

QUERIES:
${lines.map((l: string, i: number) => `${i + 1}. ${l}`).join("\n")}

Return ONLY a JSON array. Each item:
{
  "title": "blog post title, UNDER 60 chars, specific and click-worthy, in Harvest's voice (no clickbait, no em dashes)",
  "question": "the underlying question/query this answers",
  "angle": "1-2 sentences: the unique angle using real coaching experience, a contrarian or pain-point framing",
  "targetKeyword": "the primary keyword to target",
  "priority": "high | medium | low (high = clear high-intent pain point in our lane)"
}

Rules:
- Stay in lane: ICT, smart money concepts, trading psychology, prop firm/funded challenges, risk management, the struggling-trader journey. Skip anything about generic stocks/crypto/investing.
- Merge near-duplicate queries into one idea.
- No news-event topics (CPI/NFP/FOMC/etc).
- Titles must read like a human wrote them.`,
        },
      ],
    });

    let txt = resp.content[0].type === "text" ? resp.content[0].text : "[]";
    txt = txt.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    let ideas: { title: string; question: string; angle: string; targetKeyword: string; priority: string }[] = [];
    try {
      ideas = JSON.parse(txt);
    } catch {
      return NextResponse.json({ error: "Could not parse AI output" }, { status: 502 });
    }

    const items = ideas
      .filter((i) => i && i.title)
      .map((i) => ({
        title: String(i.title).slice(0, 80),
        question: String(i.question || "").slice(0, 200),
        angle: String(i.angle || "").slice(0, 400),
        targetKeyword: String(i.targetKeyword || "").slice(0, 80),
        source: "manual" as const,
        priority: (["high", "medium", "low"].includes(i.priority) ? i.priority : "medium") as "high" | "medium" | "low",
      }));

    const { added, total } = await addToQueue(items);
    return NextResponse.json({ added, total, ideas: items });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// DELETE — { id }
export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await removeFromQueue(id);
  return NextResponse.json({ ok: true });
}
