import { NextRequest, NextResponse } from "next/server";
import { readFile } from "@/lib/github";

export const maxDuration = 300; // 5 minutes for multiple videos

/**
 * Daily Automated Shorts Cron — generates 4 videos per run
 * Videos are saved as "ready" (not auto-published).
 * A separate publish cron (publish-short) runs 4x/day to publish one at a time.
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
    // Get today's topics from calendar if available
    const today = new Date().toISOString().split("T")[0];
    const topics: (string | undefined)[] = [];

    try {
      const calRaw = await readFile("data/shorts/calendar.json");
      const calendar = JSON.parse(calRaw);
      const todayEntries = calendar.filter((e: { date: string; used: boolean }) => e.date === today && !e.used);
      for (const entry of todayEntries.slice(0, 4)) {
        topics.push(entry.topic);
      }
    } catch {}

    // Pad to 3 topics (undefined = AI picks)
    while (topics.length < 3) topics.push(undefined);
    topics.splice(3); // max 3

    // Generate 3 videos sequentially (each takes ~1-2 min for script + voice + render trigger)
    const results: { title: string; status: string }[] = [];

    // Import the generate function directly to avoid HTTP overhead
    const { generateSingleShort } = await import("@/app/api/admin/shorts/generate-video/route");

    for (let i = 0; i < 3; i++) {
      try {
        const result = await generateSingleShort(topics[i], false); // ready, not auto-publish
        results.push({ title: result.title, status: result.status });
      } catch (err: unknown) {
        results.push({ title: "", status: `error: ${err instanceof Error ? err.message : "unknown"}` });
      }
    }

    const succeeded = results.filter(r => r.status === "rendering").length;
    return NextResponse.json({
      success: true,
      generated: succeeded,
      total: 4,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
