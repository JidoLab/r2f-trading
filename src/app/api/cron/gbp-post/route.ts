import { NextRequest, NextResponse } from "next/server";
import { isGBPConfigured, postToGBP } from "@/lib/gbp";
import { getAllPosts } from "@/lib/blog";
import { readFile, commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGBPConfigured()) {
    return NextResponse.json({ skipped: true, reason: "GBP not configured" });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const posts = getAllPosts();
    const todayPost = posts.find((p) => p.date === today);

    let type: "blog" | "tip";
    let summary: string;
    let ctaUrl: string;

    if (todayPost) {
      type = "blog";
      summary = `${todayPost.title}\n\n${todayPost.excerpt}`;
      ctaUrl = `https://r2ftrading.com/trading-insights/${todayPost.slug}`;
    } else {
      type = "tip";
      const anthropic = new Anthropic();
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content:
              "Generate a quick ICT trading tip in 2-3 sentences. Be specific and actionable. Focus on one concept like order blocks, fair value gaps, liquidity sweeps, killzones, or market structure. Speak as an experienced trading coach. No hashtags, no emojis.",
          },
        ],
      });
      const textBlock = msg.content.find((b) => b.type === "text");
      summary = textBlock?.text || "Master one ICT concept at a time. Focus on fair value gaps this week and mark every one you see on the 15-minute chart.";
      ctaUrl = "https://r2ftrading.com/free-class";
    }

    const posted = await postToGBP({
      summary,
      callToAction: { actionType: "LEARN_MORE", url: ctaUrl },
    });

    // Log to gbp-log.json
    let log: Record<string, unknown>[] = [];
    try {
      const raw = await readFile("data/gbp-log.json");
      log = JSON.parse(raw);
    } catch {
      /* file may not exist */
    }

    log.push({
      date: new Date().toISOString(),
      type,
      summary: summary.slice(0, 200),
      ctaUrl,
      posted,
    });

    if (log.length > 100) log = log.slice(-100);

    await commitFile(
      "data/gbp-log.json",
      JSON.stringify(log, null, 2),
      `GBP post log: ${type}`
    );

    return NextResponse.json({ success: true, type, posted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GBP post failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
