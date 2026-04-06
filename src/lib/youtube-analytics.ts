import { commitFile, readFile } from "./github";

/**
 * Phase 9: YouTube Analytics Feedback Loop
 * Pulls performance data and stores it for the AI to learn from.
 */
export async function pullYouTubeAnalytics(): Promise<void> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    console.log("[analytics] Missing YouTube credentials");
    return;
  }

  // Get access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret }),
  });
  if (!tokenRes.ok) { console.log("[analytics] Token refresh failed"); return; }
  const { access_token } = await tokenRes.json();

  // Get channel's recent videos
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&maxResults=50&order=date&type=video`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  if (!searchRes.ok) { console.log("[analytics] Search failed:", await searchRes.text()); return; }
  const searchData = await searchRes.json();
  const videoIds = searchData.items?.map((item: any) => item.id.videoId).filter(Boolean) || [];

  if (videoIds.length === 0) { console.log("[analytics] No videos found"); return; }

  // Get video statistics
  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds.join(",")}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  if (!statsRes.ok) { console.log("[analytics] Stats failed"); return; }
  const statsData = await statsRes.json();

  const videos = statsData.items?.map((item: any) => ({
    videoId: item.id,
    title: item.snippet?.title || "",
    publishedAt: item.snippet?.publishedAt || "",
    views: parseInt(item.statistics?.viewCount || "0"),
    likes: parseInt(item.statistics?.likeCount || "0"),
    comments: parseInt(item.statistics?.commentCount || "0"),
    // Retention requires YouTube Analytics API which needs additional scope
    retention: 0,
  })) || [];

  // Calculate insights
  const totalViews = videos.reduce((sum: number, v: any) => sum + v.views, 0);
  const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;

  const performance = {
    lastUpdated: new Date().toISOString(),
    totalVideos: videos.length,
    totalViews,
    avgViews,
    videos: videos.sort((a: any, b: any) => b.views - a.views),
  };

  await commitFile("data/shorts/performance.json", JSON.stringify(performance, null, 2), "YouTube analytics update");
  console.log(`[analytics] Updated: ${videos.length} videos, ${totalViews} total views, ${avgViews} avg`);
}
