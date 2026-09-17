import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { generateOAuthHeader } from "@/lib/social-auth";
import { SESSION_PATH, stats, type LiveSession } from "@/lib/live-session";

/**
 * Replay poster. Runs weekday afternoons after the London stream (10:30 UTC,
 * 5:30 PM Bangkok). Finds today's finished broadcast on the channel and posts
 * the replay link once to Telegram, X and Discord, with the session's R
 * result from the scoreboard when it is from the same day.
 *
 * Off switch: LIVE_REPLAY_ENABLED=false on Vercel.
 */

export const maxDuration = 60;

const LOG_PATH = "data/live-replay-log.json";
const LIVE_PAGE = "https://www.r2ftrading.com/live";

interface Broadcast {
  id: string;
  snippet: { title: string; actualEndTime?: string; actualStartTime?: string };
  status: { privacyStatus: string; lifeCycleStatus: string };
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

function bangkokDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

async function postTelegram(text: string): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chatId) return "skipped";
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return res.ok ? "success" : `error ${res.status}`;
}

async function postTweet(text: string): Promise<string> {
  const k = process.env.TWITTER_API_KEY, s = process.env.TWITTER_API_SECRET;
  const t = process.env.TWITTER_ACCESS_TOKEN, ts = process.env.TWITTER_ACCESS_SECRET;
  if (!k || !s || !t || !ts) return "skipped";
  const url = "https://api.twitter.com/2/tweets";
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: generateOAuthHeader("POST", url, {}, k, s, t, ts), "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.length > 280 ? text.slice(0, 277) + "..." : text }),
  });
  return res.ok ? "success" : `error ${res.status}`;
}

async function postDiscord(text: string): Promise<string> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return "skipped";
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }) });
  return res.ok || res.status === 204 ? "success" : `error ${res.status}`;
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.LIVE_REPLAY_ENABLED === "false") {
    return NextResponse.json({ status: "skipped", reason: "LIVE_REPLAY_ENABLED=false" });
  }

  try {
    const token = await youtubeToken();
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status&broadcastStatus=completed&maxResults=5",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const today = bangkokDate(new Date().toISOString());
    const done = ((data.items || []) as Broadcast[])
      .filter((b) => b.status?.privacyStatus === "public" && b.snippet?.actualEndTime && bangkokDate(b.snippet.actualEndTime) === today)
      .sort((a, b) => (b.snippet.actualEndTime || "").localeCompare(a.snippet.actualEndTime || ""));

    if (done.length === 0) {
      return NextResponse.json({ status: "skipped", reason: "no public broadcast finished today" });
    }
    const b = done[0];

    let posted: string[] = [];
    try { posted = JSON.parse(await readFile(LOG_PATH)).posted || []; } catch { /* first run */ }
    if (posted.includes(b.id)) {
      return NextResponse.json({ status: "skipped", reason: "already posted", id: b.id });
    }

    // Session result from the scoreboard, only if it is today's session.
    let result = "";
    try {
      const session = JSON.parse(await readFile(SESSION_PATH)) as LiveSession;
      if (session.date === today && session.trades.length > 0) {
        const st = stats(session);
        const r = `${st.netR > 0 ? "+" : ""}${st.netR}R`;
        result = `${st.trades} trade${st.trades === 1 ? "" : "s"}, ${st.wins} win${st.wins === 1 ? "" : "s"} ${st.losses} loss${st.losses === 1 ? "" : "es"}, ${r} on the day.`;
      }
    } catch { /* no session */ }

    const watch = `https://www.youtube.com/watch?v=${b.id}`;
    const text = `Replay is up: today's NQ London session.${result ? ` ${result}` : ""}\n\n${watch}\n\nLive again tomorrow at 8 AM London / 2 PM Bangkok: ${LIVE_PAGE}`;
    const tweet = `Replay is up: today's NQ London session, ICT concepts, entries and stops out loud.${result ? ` ${result}` : ""}\n\n${watch}`;

    const results = {
      telegram: await postTelegram(text),
      twitter: await postTweet(tweet),
      discord: await postDiscord(text),
    };

    const nextLog = { posted: [...posted, b.id].slice(-30), lastTitle: b.snippet.title, lastAt: new Date().toISOString(), lastResults: results };
    await commitFile(LOG_PATH, JSON.stringify(nextLog, null, 2) + "\n", `Replay posted: ${b.snippet.title}`);

    return NextResponse.json({ status: "posted", id: b.id, title: b.snippet.title, results });
  } catch (err) {
    return NextResponse.json({ status: "error", message: String(err) }, { status: 500 });
  }
}
