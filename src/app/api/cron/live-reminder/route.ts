import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { generateOAuthHeader } from "@/lib/social-auth";

/**
 * Live stream reminder. Runs on weekday mornings (06:00 UTC, 1 PM Bangkok).
 *
 * It only posts when a PUBLIC broadcast is actually scheduled on the channel
 * within the next few hours (broadcastStatus=upcoming already scopes to the
 * authenticated channel; adding mine=true makes the API reject the call), so a day with no stream scheduled produces no
 * post at all. Harvest schedules the stream by hand in YouTube Studio each
 * morning; this picks it up from there. Each broadcast is announced once
 * (data/live-reminder-log.json), so retries never double post.
 *
 * Off switch: set LIVE_REMINDER_ENABLED=false on Vercel.
 */

export const maxDuration = 60;

const LOG_PATH = "data/live-reminder-log.json";
const LOOKAHEAD_MS = 4 * 60 * 60 * 1000;
const GRACE_MS = 15 * 60 * 1000;
const LIVE_PAGE = "https://www.r2ftrading.com/live";

interface Broadcast {
  id: string;
  snippet: { title: string; scheduledStartTime?: string };
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

function timeIn(zone: string, iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function postTelegram(text: string): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chatId) return "skipped";
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
  });
  return res.ok ? "success" : `error ${res.status}`;
}

async function postTweet(text: string): Promise<string> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return "skipped";
  const url = "https://api.twitter.com/2/tweets";
  const auth = generateOAuthHeader("POST", url, {}, apiKey, apiSecret, accessToken, accessSecret);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.length > 280 ? text.slice(0, 277) + "..." : text }),
  });
  return res.ok ? "success" : `error ${res.status}`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.LIVE_REMINDER_ENABLED === "false") {
    return NextResponse.json({ status: "skipped", reason: "LIVE_REMINDER_ENABLED=false" });
  }

  try {
    const token = await youtubeToken();
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status&broadcastStatus=upcoming&maxResults=10",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const now = Date.now();
    const candidates = ((data.items || []) as Broadcast[])
      .filter((b) => b.status?.privacyStatus === "public" && b.snippet?.scheduledStartTime)
      .map((b) => ({ b, start: new Date(b.snippet.scheduledStartTime!).getTime() }))
      .filter(({ start }) => start >= now - GRACE_MS && start <= now + LOOKAHEAD_MS)
      .sort((a, b) => a.start - b.start);

    if (candidates.length === 0) {
      return NextResponse.json({ status: "skipped", reason: "no public broadcast scheduled in the next 4 hours" });
    }

    const { b, start } = candidates[0];

    let posted: string[] = [];
    try {
      posted = JSON.parse(await readFile(LOG_PATH)).posted || [];
    } catch {
      // first run
    }
    if (posted.includes(b.id)) {
      return NextResponse.json({ status: "skipped", reason: "already announced", id: b.id });
    }

    const iso = new Date(start).toISOString();
    const watch = `https://www.youtube.com/watch?v=${b.id}`;
    const minutes = Math.max(0, Math.round((start - now) / 60000));
    const when = minutes < 5 ? "Going live now" : `Live in about ${minutes} minutes`;
    const times = `${timeIn("Europe/London", iso)} London / ${timeIn("Asia/Bangkok", iso)} Bangkok`;

    const telegramText = `${when}: NQ at the London open, ${times}.\nBias, liquidity, entries out loud. Questions welcome in chat.\n\n${watch}\n\nSchedule in your time zone: ${LIVE_PAGE}`;
    const tweetText = `${when}: NQ live at the London open, ${times}. ICT concepts, entries and stops out loud.\n\n${watch}`;

    const results = {
      telegram: await postTelegram(telegramText),
      twitter: await postTweet(tweetText),
    };

    const nextLog = { posted: [...posted, b.id].slice(-30), lastTitle: b.snippet.title, lastAt: new Date().toISOString() };
    await commitFile(LOG_PATH, JSON.stringify(nextLog, null, 2) + "\n", `Live reminder posted: ${b.snippet.title}`);

    return NextResponse.json({ status: "posted", id: b.id, title: b.snippet.title, start: iso, results });
  } catch (err) {
    return NextResponse.json({ status: "error", message: String(err) }, { status: 500 });
  }
}
