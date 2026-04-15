import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, listFiles } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  interface VideoPerf {
    videoId: string;
    title: string;
    publishedAt: string;
    views: number;
    likes: number;
    comments: number;
  }

  const result: {
    calendar: { date: string; topic: string; contentType: string; used: boolean }[];
    seriesTracker: Record<string, number>;
    performance: {
      lastPull: string;
      topVideos: { title: string; views: number }[];
      bottomVideos: { title: string; views: number }[];
      totalVideos: number;
    } | null;
    youtubeMetrics: {
      videos: VideoPerf[];
      totalViews: number;
      totalLikes: number;
      totalComments: number;
      avgViews: number;
      lastPublishedAt: string | null;
      daysSinceLastPublish: number;
      lastUpdated: string;
    } | null;
    unpublishedVideos: { slug: string; title: string; createdAt: string }[];
    pendingScripts: string[];
    config: { enabled: boolean };
  } = {
    calendar: [],
    seriesTracker: {},
    performance: null,
    youtubeMetrics: null,
    unpublishedVideos: [],
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
    try {
      result.performance = JSON.parse(perfRes.value);

      // Build rich YouTube metrics from the same data
      const perfData = JSON.parse(perfRes.value);
      const videos: VideoPerf[] = (perfData.videos || []).map((v: Record<string, unknown>) => ({
        videoId: v.videoId || "",
        title: (v.title as string) || "",
        publishedAt: (v.publishedAt as string) || "",
        views: (v.views as number) || 0,
        likes: (v.likes as number) || 0,
        comments: (v.comments as number) || 0,
      }));

      const totalViews = videos.reduce((s, v) => s + v.views, 0);
      const totalLikes = videos.reduce((s, v) => s + v.likes, 0);
      const totalComments = videos.reduce((s, v) => s + v.comments, 0);

      // Find last published date
      const sorted = [...videos].filter(v => v.publishedAt).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      const lastPublishedAt = sorted[0]?.publishedAt || null;
      const daysSinceLastPublish = lastPublishedAt
        ? Math.floor((Date.now() - new Date(lastPublishedAt).getTime()) / 86400000)
        : 999;

      result.youtubeMetrics = {
        videos,
        totalViews,
        totalLikes,
        totalComments,
        avgViews: videos.length > 0 ? Math.round(totalViews / videos.length) : 0,
        lastPublishedAt,
        daysSinceLastPublish,
        lastUpdated: perfData.lastUpdated || "",
      };
    } catch {}
  }

  // Find unpublished (ready) videos
  try {
    const renderFiles = await listFiles("data/shorts/renders");
    for (const file of renderFiles) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(file);
        const data = JSON.parse(raw);
        if (data.status === "ready") {
          result.unpublishedVideos.push({
            slug: file.replace("data/shorts/renders/", "").replace(".json", ""),
            title: data.title || data.topic || "Untitled",
            createdAt: data.createdAt || "",
          });
        }
      } catch {}
    }
  } catch {}
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
