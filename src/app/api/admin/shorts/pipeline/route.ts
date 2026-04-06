import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, listFiles } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result: {
    calendar: { date: string; topic: string; contentType: string; used: boolean }[];
    seriesTracker: Record<string, number>;
    performance: { lastPull: string; topVideos: { title: string; views: number }[]; bottomVideos: { title: string; views: number }[]; totalVideos: number } | null;
    pendingScripts: string[];
    config: { enabled: boolean };
  } = {
    calendar: [],
    seriesTracker: {},
    performance: null,
    pendingScripts: [],
    config: { enabled: false },
  };

  // Fetch all data in parallel
  const [calRes, seriesRes, perfRes, pendingRes, configRes] = await Promise.allSettled([
    readFile("data/shorts/calendar.json"),
    readFile("data/shorts/series-tracker.json"),
    readFile("data/shorts/performance.json"),
    listFiles("data/shorts/pending").catch(() => []),
    readFile("config/auto-generate-shorts.json"),
  ]);

  if (calRes.status === "fulfilled") {
    try { result.calendar = JSON.parse(calRes.value); } catch {}
  }
  if (seriesRes.status === "fulfilled") {
    try { result.seriesTracker = JSON.parse(seriesRes.value); } catch {}
  }
  if (perfRes.status === "fulfilled") {
    try { result.performance = JSON.parse(perfRes.value); } catch {}
  }
  if (pendingRes.status === "fulfilled") {
    try {
      const files = pendingRes.value as string[];
      result.pendingScripts = files.filter((f: string) => f.endsWith("/script.json")).map((f: string) => f.replace("data/shorts/pending/", "").replace("/script.json", ""));
    } catch {}
  }
  if (configRes.status === "fulfilled") {
    try { result.config = JSON.parse(configRes.value); } catch {}
  }

  return NextResponse.json(result);
}
