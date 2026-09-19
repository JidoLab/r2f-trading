import { NextRequest, NextResponse } from "next/server";

/**
 * Friday stream report to Harvest's own Telegram (owner chat, not the
 * channel). Runs 11:00 UTC Fridays (6 PM Bangkok): this week's streams with
 * replay views, average view duration, subscribers gained, and where the
 * views came from. Analytics lag ~2 days, so the newest streams show views
 * from the Data API and "n/a" for retention.
 *
 * Off switch: STREAM_WEEKLY_ENABLED=false on Vercel.
 */
export const maxDuration = 60;

interface Broadcast {
  id: string;
  snippet: { title: string; actualStartTime?: string; actualEndTime?: string };
  status: { privacyStatus: string };
}

async function youtubeToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID || "",
      client_secret: process.env.YOUTUBE_CLIENT_SECRET || "",
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN || "",
      grant_type: "refresh_token",
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error("YouTube token refresh failed");
  return j.access_token;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mins(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m${String(s).padStart(2, "0")}s`;
}

const SOURCE_LABEL: Record<string, string> = {
  SUBSCRIBER: "subscriber feed",
  YT_SEARCH: "search",
  RELATED_VIDEO: "suggested",
  YT_CHANNEL: "channel page",
  NOTIFICATION: "notifications",
  EXT_URL: "external links",
  PLAYLIST: "playlists",
  SHORTS: "shorts feed",
  NO_LINK_OTHER: "direct",
};

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.STREAM_WEEKLY_ENABLED === "false") {
    return NextResponse.json({ status: "skipped", reason: "STREAM_WEEKLY_ENABLED=false" });
  }
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const owner = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!tgToken || !owner) return NextResponse.json({ status: "skipped", reason: "no owner chat" });

  try {
    const token = await youtubeToken();
    const H = { Authorization: `Bearer ${token}` };
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    const bres = await fetch("https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status&broadcastStatus=completed&maxResults=15", { headers: H });
    const bdata = await bres.json();
    const streams = ((bdata.items || []) as Broadcast[])
      .filter((b) => b.status.privacyStatus === "public" && b.snippet.actualStartTime && new Date(b.snippet.actualStartTime) >= weekAgo)
      .sort((a, b) => (a.snippet.actualStartTime || "").localeCompare(b.snippet.actualStartTime || ""));

    if (streams.length === 0) {
      const text = "Stream week: no public streams went live in the last 7 days.";
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: owner, text }) });
      return NextResponse.json({ status: "posted", streams: 0 });
    }

    const ids = streams.map((s) => s.id);
    const vres = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.join(",")}`, { headers: H });
    const vdata = await vres.json();
    const stats: Record<string, { views: number; likes: number; comments: number }> = {};
    for (const v of vdata.items || []) {
      stats[v.id] = { views: Number(v.statistics?.viewCount || 0), likes: Number(v.statistics?.likeCount || 0), comments: Number(v.statistics?.commentCount || 0) };
    }

    const retention: Record<string, { avd: number; subs: number }> = {};
    const sources: [string, number][] = [];
    try {
      const q = new URLSearchParams({ ids: "channel==MINE", startDate: ymd(weekAgo), endDate: ymd(now), metrics: "averageViewDuration,subscribersGained", dimensions: "video", filters: `video==${ids.join(",")}` });
      const a = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${q}`, { headers: H }).then((r) => r.json());
      for (const row of a.rows || []) retention[row[0]] = { avd: row[1], subs: row[2] };
      const q2 = new URLSearchParams({ ids: "channel==MINE", startDate: ymd(weekAgo), endDate: ymd(now), metrics: "views", dimensions: "insightTrafficSourceType", filters: `video==${ids.join(",")}`, sort: "-views" });
      const t = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${q2}`, { headers: H }).then((r) => r.json());
      for (const row of t.rows || []) if (row[1] > 0) sources.push([SOURCE_LABEL[row[0]] || row[0].toLowerCase(), row[1]]);
    } catch {
      // analytics optional
    }

    const lines = [`Stream week (${streams.length} stream${streams.length === 1 ? "" : "s"}):`, ""];
    let totalViews = 0, totalSubs = 0, totalComments = 0;
    for (const s of streams) {
      const day = new Date(s.snippet.actualStartTime!).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
      const st = stats[s.id] || { views: 0, likes: 0, comments: 0 };
      const r = retention[s.id];
      const len = s.snippet.actualEndTime ? mins((new Date(s.snippet.actualEndTime).getTime() - new Date(s.snippet.actualStartTime!).getTime()) / 1000) : "";
      lines.push(`${day} ${len}: ${st.views} views, ${st.likes} likes, ${st.comments} comments${r ? `, avg ${mins(r.avd)}` : ""}`);
      totalViews += st.views; totalSubs += r?.subs || 0; totalComments += st.comments;
    }
    lines.push("", `Total ${totalViews} replay views, ${totalSubs} subs gained, ${totalComments} comments.`);
    if (sources.length) lines.push(`Views came from: ${sources.slice(0, 4).map(([k, v]) => `${k} ${v}`).join(", ")}.`);
    lines.push("", "Retention lags two days. Full method: docs/stream-week-1-review.md");

    const text = lines.join("\n");
    const tg = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: owner, text }) });
    return NextResponse.json({ status: tg.ok ? "posted" : "telegram error", streams: streams.length, text });
  } catch (err) {
    return NextResponse.json({ status: "error", message: String(err) }, { status: 500 });
  }
}
