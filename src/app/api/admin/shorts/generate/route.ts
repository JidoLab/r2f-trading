import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { topic } = await req.json();
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `Generate a YouTube Shorts script for R2F Trading (ICT trading coaching by Harvest Wright, 10+ years experience).

${topic ? `TOPIC: "${topic}"` : "Pick a trending/engaging ICT trading topic that would perform well as a Short."}

REQUIREMENTS:
- 30-45 seconds when spoken (approximately 80-120 words)
- Start with a strong HOOK (first 2 seconds must grab attention)
- Include 2-3 key points or insights
- End with a CTA (follow for more, link in bio, book a call)
- Conversational, direct tone — as if talking to a trading buddy
- Include specific ICT terms naturally

Return ONLY a JSON object (no code fences):
{
  "title": "YouTube Short title (max 100 chars)",
  "description": "YouTube description (2-3 sentences)",
  "hashtags": ["#ICTTrading", "#ForexTrader", "..."],
  "script": "The exact words to speak, with ... for pauses",
  "hookLine": "Opening hook text (5-8 words)",
  "ctaLine": "CTA text overlay",
  "textOverlays": [
    {"timestamp": "0s", "text": "HOOK TEXT", "style": "hook"},
    {"timestamp": "8s", "text": "Key point", "style": "key-point"},
    {"timestamp": "18s", "text": "Stat or fact", "style": "stat"},
    {"timestamp": "30s", "text": "CTA", "style": "cta"}
  ],
  "visualNotes": ["Visual descriptions for each segment"],
  "estimatedDuration": 35
}`,
      }],
    });

    let text = response.content[0].type === "text" ? response.content[0].text : "";
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    const script = JSON.parse(text);

    // Save script to GitHub
    const slug = script.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
    await commitFile(
      `data/shorts/${slug}/script.json`,
      JSON.stringify(script, null, 2),
      `YouTube Short script: ${script.title}`
    );

    return NextResponse.json({ success: true, script, slug });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
