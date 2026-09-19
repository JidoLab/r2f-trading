/**
 * Live-stream YouTube facts shared by the /live page and the stream crons.
 *
 * REPLAY_PLAYLIST_ID is Harvest's "NQ Live Trading ICT | London Session
 * Replays" playlist (created by him as "LIVE Trading" on 14 Sep 2026, renamed
 * for search on 19 Sep). The replay poster adds each day's replay to it.
 */
export const CHANNEL_ID = "UCOJcTd6NQnnaaM5r2dFd-Yg";
export const REPLAY_PLAYLIST_ID = "PLHvyQzfItOeY";
export const REPLAY_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${REPLAY_PLAYLIST_ID}`;

export interface Replay {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
}

/**
 * Latest replays from the playlist, newest first, for the /live page.
 * Uses the public API key and Next's data cache (1 hour), so page views cost
 * nothing against the quota. Returns [] when the key is missing or the API
 * fails; the page simply omits the section.
 */
export async function getLatestReplays(limit = 6): Promise<Replay[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  try {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${REPLAY_PLAYLIST_ID}&maxResults=25&key=${key}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    const items = (data.items || []) as { snippet: { title: string; publishedAt: string; resourceId: { videoId: string }; thumbnails?: Record<string, { url: string }> } }[];
    const candidates = items
      .filter((i) => i.snippet.title !== "Deleted video" && i.snippet.title !== "Private video")
      .map((i) => ({
        id: i.snippet.resourceId.videoId,
        title: i.snippet.title,
        publishedAt: i.snippet.publishedAt,
        thumbnail: i.snippet.thumbnails?.medium?.url || i.snippet.thumbnails?.default?.url || "",
      }));
    if (candidates.length === 0) return [];
    // Harvest adds the upcoming stream to the playlist too; only finished
    // broadcasts are replays. Order by when the stream actually ended.
    const vres = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${candidates.map((c) => c.id).join(",")}&key=${key}`,
      { next: { revalidate: 3600 } }
    );
    const ended: Record<string, string> = {};
    if (vres.ok) {
      const vdata = await vres.json();
      for (const v of (vdata.items || []) as { id: string; liveStreamingDetails?: { actualEndTime?: string } }[]) {
        if (v.liveStreamingDetails?.actualEndTime) ended[v.id] = v.liveStreamingDetails.actualEndTime;
      }
    }
    return candidates
      .filter((c) => ended[c.id])
      .map((c) => ({ ...c, publishedAt: ended[c.id] }))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, limit);
  } catch {
    return [];
  }
}
