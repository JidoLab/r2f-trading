import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile, listFiles } from "@/lib/github";

export const dynamic = "force-dynamic";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

const COMPETITORS = [
  { name: "ICT (Inner Circle Trader)", channel: "@InnerCircleTrader" },
  { name: "The Trading Channel", channel: "@TheTradingChannel" },
  { name: "MentFX", channel: "@MentFX" },
  { name: "TradoVate", channel: "@Tradovate" },
];

interface CachedData {
  fetchedAt: string;
  competitors: CompetitorData[];
  contentGaps: string[];
}

interface CompetitorData {
  name: string;
  channel: string;
  channelId: string;
  subscriberCount: string;
  videoCount: string;
  thumbnailUrl: string;
  latestVideos: { title: string; videoId: string; publishedAt: string; viewCount: string; thumbnailUrl: string }[];
  videosPerWeek: number;
}

async function ytFetch(endpoint: string, params: Record<string, string>) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY not set");
  const url = new URL(`${YOUTUBE_API}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  return res.json();
}

async function fetchCompetitorData(competitor: { name: string; channel: string }): Promise<CompetitorData | null> {
  try {
    // Search for the channel
    const searchResult = await ytFetch("search", {
      part: "snippet",
      q: competitor.channel,
      type: "channel",
      maxResults: "1",
    });
    const channelId = searchResult.items?.[0]?.id?.channelId;
    if (!channelId) return null;

    // Get channel stats
    const channelResult = await ytFetch("channels", {
      part: "statistics,snippet",
      id: channelId,
    });
    const ch = channelResult.items?.[0];
    if (!ch) return null;

    // Get latest videos
    const videosResult = await ytFetch("search", {
      part: "snippet",
      channelId,
      order: "date",
      maxResults: "3",
      type: "video",
    });
    const videoIds = (videosResult.items || []).map((v: { id: { videoId: string } }) => v.id.videoId).join(",");

    // Get video stats
    let videoStats: Record<string, string> = {};
    if (videoIds) {
      const statsResult = await ytFetch("videos", {
        part: "statistics",
        id: videoIds,
      });
      for (const v of statsResult.items || []) {
        videoStats[v.id] = v.statistics?.viewCount || "0";
      }
    }

    const latestVideos = (videosResult.items || []).map((v: { id: { videoId: string }; snippet: { title: string; publishedAt: string; thumbnails: { medium: { url: string } } } }) => ({
      title: v.snippet.title,
      videoId: v.id.videoId,
      publishedAt: v.snippet.publishedAt,
      viewCount: videoStats[v.id.videoId] || "0",
      thumbnailUrl: v.snippet.thumbnails?.medium?.url || "",
    }));

    // Calculate posting frequency (videos per week based on last 3 videos)
    let videosPerWeek = 0;
    if (latestVideos.length >= 2) {
      const newest = new Date(latestVideos[0].publishedAt).getTime();
      const oldest = new Date(latestVideos[latestVideos.length - 1].publishedAt).getTime();
      const daysBetween = Math.max(1, (newest - oldest) / (1000 * 60 * 60 * 24));
      videosPerWeek = Math.round((latestVideos.length / daysBetween) * 7 * 10) / 10;
    }

    return {
      name: competitor.name,
      channel: competitor.channel,
      channelId,
      subscriberCount: ch.statistics?.subscriberCount || "0",
      videoCount: ch.statistics?.videoCount || "0",
      thumbnailUrl: ch.snippet?.thumbnails?.medium?.url || "",
      latestVideos,
      videosPerWeek,
    };
  } catch (e) {
    console.error(`Failed to fetch data for ${competitor.name}:`, e);
    return null;
  }
}

async function getR2FBlogTopics(): Promise<string[]> {
  try {
    const files = await listFiles("content/blog", ".mdx");
    return files.map(f => {
      const name = f.split("/").pop() || "";
      // Remove date prefix and extension, convert dashes to spaces
      return name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.mdx$/, "").replace(/-/g, " ");
    });
  } catch {
    return [];
  }
}

function findContentGaps(competitorVideos: string[], r2fTopics: string[]): string[] {
  const r2fLower = r2fTopics.map(t => t.toLowerCase());
  const gaps: string[] = [];

  for (const title of competitorVideos) {
    const titleLower = title.toLowerCase();
    // Check if R2F has covered something similar
    const covered = r2fLower.some(topic => {
      const words = topic.split(" ").filter(w => w.length > 3);
      const matchCount = words.filter(w => titleLower.includes(w)).length;
      return matchCount >= 3;
    });
    if (!covered) {
      gaps.push(title);
    }
  }

  return gaps.slice(0, 10);
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check cache (refresh max once per day)
  try {
    const raw = await readFile("data/competitor-data.json");
    const cached: CachedData = JSON.parse(raw);
    const fetchedAt = new Date(cached.fetchedAt).getTime();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (fetchedAt > oneDayAgo) {
      return NextResponse.json(cached);
    }
  } catch {
    // No cache or invalid, fetch fresh
  }

  // Check if API key exists
  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      competitors: [],
      contentGaps: [],
      error: "YOUTUBE_API_KEY not configured",
    });
  }

  // Fetch fresh data
  const results: CompetitorData[] = [];
  for (const comp of COMPETITORS) {
    const data = await fetchCompetitorData(comp);
    if (data) results.push(data);
  }

  // Content gaps analysis
  const allVideoTitles = results.flatMap(c => c.latestVideos.map(v => v.title));
  const r2fTopics = await getR2FBlogTopics();
  const contentGaps = findContentGaps(allVideoTitles, r2fTopics);

  const payload: CachedData = {
    fetchedAt: new Date().toISOString(),
    competitors: results,
    contentGaps,
  };

  // Cache to GitHub
  try {
    await commitFile(
      "data/competitor-data.json",
      JSON.stringify(payload, null, 2),
      "chore: update competitor data cache"
    );
  } catch (e) {
    console.error("Failed to cache competitor data:", e);
  }

  return NextResponse.json(payload);
}
