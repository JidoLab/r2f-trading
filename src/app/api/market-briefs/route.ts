import { NextResponse } from "next/server";
import { listFiles, readFile } from "@/lib/github";

export const revalidate = 3600; // Cache for 1 hour

/**
 * GET /api/market-briefs
 * Returns list of recent market briefs (public, no auth needed).
 * Used by the /market-brief page.
 */
export async function GET() {
  try {
    const files = await listFiles("data/market-briefs", ".json");

    if (files.length === 0) {
      return NextResponse.json({ briefs: [] });
    }

    // Sort by filename (date) descending — newest first
    const sorted = files.sort().reverse();

    // Fetch the latest 30 briefs
    const briefs: {
      date: string;
      title: string;
      script: string;
      audioUrl: string;
      duration: number;
    }[] = [];

    for (const filePath of sorted.slice(0, 30)) {
      try {
        const raw = await readFile(filePath);
        const data = JSON.parse(raw);
        briefs.push({
          date: data.date,
          title: data.title,
          script: data.script,
          audioUrl: data.audioUrl,
          duration: data.duration || 120,
        });
      } catch {
        // Skip corrupted entries
      }
    }

    return NextResponse.json({ briefs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load briefs";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
