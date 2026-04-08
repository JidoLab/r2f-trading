import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";

export const maxDuration = 300; // 5 minutes for multiple videos

/**
 * Daily Automated Shorts Cron — generates 3 videos per run
 * Videos are saved as "ready" (not auto-published).
 * A separate publish cron (publish-short) runs 3x/day to publish one at a time.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if auto-generation is enabled
  try {
    const configRaw = await readFile("config/auto-generate-shorts.json");
    const config = JSON.parse(configRaw);
    if (!config.enabled) {
      return NextResponse.json({ skipped: true, reason: "Shorts auto-generation disabled" });
    }
  } catch {
    return NextResponse.json({ skipped: true, reason: "Shorts auto-generation not configured" });
  }

  try {
    // Use Bangkok timezone for date matching (matches calendar generation)
    const bangkokNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const today = bangkokNow.toISOString().split("T")[0];
    const topics: (string | undefined)[] = [];
    let calendar: { date: string; topic: string; used: boolean; contentType?: string }[] = [];
    const usedIndices: number[] = [];

    try {
      const calRaw = await readFile("data/shorts/calendar.json");
      calendar = JSON.parse(calRaw);
      // Find today's unused entries, or if none, find the oldest unused entries
      let candidates = calendar
        .map((e, idx) => ({ ...e, idx }))
        .filter(e => !e.used);

      // Prefer today's date, but fall back to oldest unused if no match
      const todayCandidates = candidates.filter(e => e.date === today);
      if (todayCandidates.length > 0) {
        candidates = todayCandidates;
      } else {
        // Sort by date ascending — use oldest unused topics
        candidates.sort((a, b) => a.date.localeCompare(b.date));
      }

      for (const entry of candidates.slice(0, 3)) {
        topics.push(entry.topic);
        usedIndices.push(entry.idx);
      }
    } catch {}

    // Pad to 3 topics (undefined = AI picks)
    while (topics.length < 3) topics.push(undefined);
    topics.splice(3); // max 3

    // Generate 3 videos sequentially (each takes ~30-60s for script + voice + render trigger)
    const results: { title: string; status: string; error?: string }[] = [];

    // Import the generate function directly to avoid HTTP overhead
    const { generateSingleShort } = await import("@/app/api/admin/shorts/generate-video/route");

    for (let i = 0; i < 3; i++) {
      try {
        const result = await generateSingleShort(topics[i], false); // ready, not auto-publish
        results.push({ title: result.title, status: result.status });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "unknown";
        results.push({ title: topics[i] || "", status: "error", error: errMsg });
      }
    }

    // Mark calendar topics as used so they aren't picked again
    if (usedIndices.length > 0 && calendar.length > 0) {
      for (const idx of usedIndices) {
        if (calendar[idx]) calendar[idx].used = true;
      }
      await commitFile(
        "data/shorts/calendar.json",
        JSON.stringify(calendar, null, 2),
        `Mark ${usedIndices.length} calendar topics as used`
      ).catch(() => {});
    }

    const succeeded = results.filter(r => r.status === "rendering").length;
    const errors = results.filter(r => r.status === "error");

    // Log failures to a debug file for troubleshooting
    if (errors.length > 0) {
      const debugLog = {
        date: new Date().toISOString(),
        today,
        topicsAttempted: topics,
        results,
        errors: errors.map(e => e.error),
      };
      await commitFile(
        `data/shorts/debug/${today}.json`,
        JSON.stringify(debugLog, null, 2),
        `Shorts generation debug: ${succeeded} ok, ${errors.length} errors`
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      generated: succeeded,
      failed: errors.length,
      total: 3,
      date: today,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
