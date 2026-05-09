import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { getRedditAccessToken, getRedditUserAgent } from "@/lib/reddit-auth";
import { generateOAuthHeader } from "@/lib/social-auth";

// Bumped from 30s — now polls Reddit + Twitter + YouTube in one run.
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface RedditEngageLogEntry {
  postId: string;
  subreddit: string;
  postTitle: string;
  commentText: string;
  mentionedR2F: boolean;
  commentedAt: string;
  permalink?: string;
  commentId?: string;
  hasReply?: boolean;
  firstReplyAt?: string;
  firstReplyAuthor?: string;
  firstReplyText?: string;
}

interface TwitterEngageLogEntry {
  tweetId: string;
  tweetText?: string;
  reply?: string;
  authorId?: string;
  query?: string;
  date?: string;
  hasReply?: boolean;
  replyDetectedAt?: string;
  replyCount?: number;
}

interface ReplyNotification {
  id: string;
  platform: "reddit" | "twitter" | "youtube";
  postTitle: string;
  subreddit?: string;
  replyAuthor: string;
  replyText: string;
  commentUrl: string;
  detectedAt: string;
}

interface ReplyCursors {
  youtubeLastCheckedAt?: string; // ISO — only surface comments newer than this
}

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

const REDDIT_LOG_PATH = "data/reddit-engage-log.json";
const TWITTER_LOG_PATH = "data/twitter-engage-log.json";
const REPLY_NOTIFICATIONS_PATH = "data/reply-notifications.json";
const REPLY_CURSORS_PATH = "data/reply-cursors.json";

// ─────────────────────────────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────────────────────────────

async function loadJsonOrEmpty<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path);
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Reddit — uses already-stored commentIds and pulls reply trees
// ─────────────────────────────────────────────────────────────────────

async function checkRedditReplies(
  notifications: ReplyNotification[],
  existingNotifIds: Set<string>
): Promise<{ checked: number; newReplies: number; available: boolean }> {
  const accessToken = await getRedditAccessToken();
  if (!accessToken) return { checked: 0, newReplies: 0, available: false };

  const ua = getRedditUserAgent();
  const log = await loadJsonOrEmpty<RedditEngageLogEntry[]>(REDDIT_LOG_PATH, []);

  // Only check comments from last 14 days that don't already have a reply flagged
  const cutoff = Date.now() - 14 * 86400000;
  const toCheck = log.filter(
    (entry) =>
      entry.commentId &&
      !entry.hasReply &&
      new Date(entry.commentedAt).getTime() > cutoff
  );
  if (toCheck.length === 0) return { checked: 0, newReplies: 0, available: true };

  const batch = toCheck.slice(0, 50);
  let newReplies = 0;
  let logUpdated = false;

  for (const entry of batch) {
    if (!entry.commentId || entry.hasReply) continue;

    try {
      const commentRes = await fetch(
        `https://oauth.reddit.com/r/${entry.subreddit}/comments/${entry.postId}?comment=${entry.commentId}&depth=2&limit=5`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": ua,
          },
        }
      );
      if (!commentRes.ok) continue;
      const commentData = await commentRes.json();
      const commentListing = commentData?.[1]?.data?.children || [];
      for (const c of commentListing) {
        if (c.data?.id !== entry.commentId || !c.data?.replies) continue;
        const replyChildren = c.data.replies?.data?.children || [];
        const actualReplies = replyChildren.filter(
          (r: { kind: string; data?: { author?: string } }) =>
            r.kind === "t1" && r.data?.author !== process.env.REDDIT_USERNAME
        );
        if (actualReplies.length === 0) continue;

        const firstReply = actualReplies[0].data;
        const replyAuthor = firstReply.author || "unknown";
        const replyText = (firstReply.body || "").slice(0, 300);
        const replyCreated = firstReply.created_utc
          ? new Date(firstReply.created_utc * 1000).toISOString()
          : new Date().toISOString();

        const logIdx = log.findIndex((e) => e.commentId === entry.commentId);
        if (logIdx >= 0) {
          log[logIdx].hasReply = true;
          log[logIdx].firstReplyAt = replyCreated;
          log[logIdx].firstReplyAuthor = replyAuthor;
          log[logIdx].firstReplyText = replyText;
          logUpdated = true;
        }

        const notifId = `reply-${entry.commentId}`;
        if (!existingNotifIds.has(notifId)) {
          notifications.unshift({
            id: notifId,
            platform: "reddit",
            postTitle: entry.postTitle,
            subreddit: entry.subreddit,
            replyAuthor,
            replyText,
            commentUrl: entry.permalink
              ? `https://www.reddit.com${entry.permalink}`
              : `https://www.reddit.com/r/${entry.subreddit}/comments/${entry.postId}`,
            detectedAt: new Date().toISOString(),
          });
          existingNotifIds.add(notifId);
          newReplies++;
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      // Skip on network error, will retry next run
    }
  }

  if (logUpdated) {
    await commitFile(
      REDDIT_LOG_PATH,
      JSON.stringify(log, null, 2),
      `Reply check: ${newReplies} new Reddit replies detected`
    ).catch(() => {});
  }
  return { checked: batch.length, newReplies, available: true };
}

// ─────────────────────────────────────────────────────────────────────
// Twitter — free-tier compatible: uses /2/tweets lookup to detect when
// reply_count goes 0 → N on tweets we've posted. Reply text/author isn't
// available on free tier (search/recent is paid), so the notification
// links out to the tweet for Harvest to view replies on twitter.com.
// ─────────────────────────────────────────────────────────────────────

async function checkTwitterReplies(
  notifications: ReplyNotification[],
  existingNotifIds: Set<string>
): Promise<{ checked: number; newReplies: number; available: boolean }> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return { checked: 0, newReplies: 0, available: false };
  }

  const log = await loadJsonOrEmpty<TwitterEngageLogEntry[]>(TWITTER_LOG_PATH, []);
  const cutoff = Date.now() - 14 * 86400000;
  const toCheck = log.filter(
    (e) =>
      e.tweetId &&
      !e.hasReply &&
      e.date &&
      new Date(e.date).getTime() > cutoff
  );
  if (toCheck.length === 0) return { checked: 0, newReplies: 0, available: true };

  // Lookup endpoint allows up to 100 IDs per call (free tier compatible)
  const batch = toCheck.slice(0, 100);
  const ids = batch.map((e) => e.tweetId).join(",");
  const url = "https://api.twitter.com/2/tweets";
  const params = { ids, "tweet.fields": "public_metrics" };

  try {
    const auth = generateOAuthHeader(
      "GET",
      url,
      params,
      apiKey,
      apiSecret,
      accessToken,
      accessSecret
    );
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${url}?${qs}`, { headers: { Authorization: auth } });
    if (!res.ok) {
      console.error(`[check-replies] Twitter lookup failed: ${res.status}`);
      return { checked: batch.length, newReplies: 0, available: false };
    }
    const data = await res.json();
    const tweets: { id: string; public_metrics?: { reply_count?: number } }[] =
      data.data || [];

    let newReplies = 0;
    let logUpdated = false;

    for (const tw of tweets) {
      const replyCount = tw.public_metrics?.reply_count || 0;
      if (replyCount === 0) continue;

      const logIdx = log.findIndex((e) => e.tweetId === tw.id);
      if (logIdx < 0 || log[logIdx].hasReply) continue;
      log[logIdx].hasReply = true;
      log[logIdx].replyCount = replyCount;
      log[logIdx].replyDetectedAt = new Date().toISOString();
      logUpdated = true;

      const notifId = `reply-tw-${tw.id}`;
      if (existingNotifIds.has(notifId)) continue;
      const tweetUrl = `https://twitter.com/i/web/status/${tw.id}`;
      notifications.unshift({
        id: notifId,
        platform: "twitter",
        postTitle: (log[logIdx].tweetText || "").slice(0, 100),
        replyAuthor: "(view on Twitter)",
        replyText: `${replyCount} repl${replyCount === 1 ? "y" : "ies"} on your tweet — open to view`,
        commentUrl: tweetUrl,
        detectedAt: new Date().toISOString(),
      });
      existingNotifIds.add(notifId);
      newReplies++;
    }

    if (logUpdated) {
      await commitFile(
        TWITTER_LOG_PATH,
        JSON.stringify(log, null, 2),
        `Reply check: ${newReplies} new Twitter replies detected`
      ).catch(() => {});
    }
    return { checked: batch.length, newReplies, available: true };
  } catch (err) {
    console.error("[check-replies] Twitter check threw:", err instanceof Error ? err.message : err);
    return { checked: batch.length, newReplies: 0, available: false };
  }
}

// ─────────────────────────────────────────────────────────────────────
// YouTube — surfaces new comments on Harvest's channel videos. Uses
// commentThreads.list?allThreadsRelatedToChannelId — 1 quota unit per
// call. Tracks a lastCheckedAt cursor so we don't double-notify.
// ─────────────────────────────────────────────────────────────────────

async function getYouTubeApiKey(): Promise<string | null> {
  return (
    process.env.YOUTUBE_API_KEY ||
    process.env.YOUTUBE_API_KEY_2 ||
    process.env.YOUTUBE_API_KEY_3 ||
    null
  );
}

async function getYouTubeOAuthToken(): Promise<string | null> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

async function checkYouTubeReplies(
  notifications: ReplyNotification[],
  existingNotifIds: Set<string>,
  cursors: ReplyCursors
): Promise<{ checked: number; newReplies: number; available: boolean }> {
  // commentThreads.list?allThreadsRelatedToChannelId requires OAuth
  // (channel owner permission), not just an API key. So OAuth is mandatory.
  const oauthToken = await getYouTubeOAuthToken();
  if (!oauthToken) return { checked: 0, newReplies: 0, available: false };

  const apiKey = await getYouTubeApiKey();

  // Resolve our channel ID once (1 quota unit)
  let channelId: string | null = null;
  try {
    const chRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
      { headers: { Authorization: `Bearer ${oauthToken}` } }
    );
    if (chRes.ok) {
      const chData = await chRes.json();
      channelId = chData.items?.[0]?.id || null;
    }
  } catch {
    // ignore — handled below
  }
  if (!channelId) return { checked: 0, newReplies: 0, available: false };

  // Fetch recent comments across all our videos (1 quota unit)
  const params = new URLSearchParams({
    part: "snippet",
    allThreadsRelatedToChannelId: channelId,
    order: "time",
    maxResults: "20",
    ...(apiKey ? { key: apiKey } : {}),
  });
  let threads: Array<{
    id: string;
    snippet?: {
      topLevelComment?: {
        snippet?: {
          authorDisplayName?: string;
          authorChannelUrl?: string;
          textOriginal?: string;
          publishedAt?: string;
          videoId?: string;
        };
      };
      videoId?: string;
    };
  }> = [];
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?${params}`,
      { headers: { Authorization: `Bearer ${oauthToken}` } }
    );
    if (!res.ok) {
      console.error(`[check-replies] YouTube commentThreads failed: ${res.status}`);
      return { checked: 0, newReplies: 0, available: false };
    }
    const data = await res.json();
    threads = data.items || [];
  } catch (err) {
    console.error("[check-replies] YouTube fetch threw:", err instanceof Error ? err.message : err);
    return { checked: 0, newReplies: 0, available: false };
  }

  const since = cursors.youtubeLastCheckedAt
    ? new Date(cursors.youtubeLastCheckedAt).getTime()
    : Date.now() - 7 * 86400000; // first run: look back 7 days
  const ourChannelUrl = `http://www.youtube.com/channel/${channelId}`;

  let newReplies = 0;
  let mostRecentSeen = since;

  for (const thread of threads) {
    const top = thread.snippet?.topLevelComment?.snippet;
    if (!top) continue;
    const publishedMs = top.publishedAt
      ? new Date(top.publishedAt).getTime()
      : 0;
    if (publishedMs <= since) continue;
    if (publishedMs > mostRecentSeen) mostRecentSeen = publishedMs;

    // Skip our own comments on our own videos
    if (top.authorChannelUrl === ourChannelUrl) continue;

    const author = top.authorDisplayName || "Unknown";
    const text = (top.textOriginal || "").slice(0, 300);
    const videoId = thread.snippet?.videoId || top.videoId;
    if (!videoId) continue;

    const notifId = `reply-yt-${thread.id}`;
    if (existingNotifIds.has(notifId)) continue;
    notifications.unshift({
      id: notifId,
      platform: "youtube",
      postTitle: `Comment on your video`,
      replyAuthor: author,
      replyText: text,
      commentUrl: `https://www.youtube.com/watch?v=${videoId}&lc=${thread.id}`,
      detectedAt: new Date().toISOString(),
    });
    existingNotifIds.add(notifId);
    newReplies++;
  }

  // Update cursor so next run skips what we just notified about
  cursors.youtubeLastCheckedAt = new Date(mostRecentSeen).toISOString();

  return { checked: threads.length, newReplies, available: true };
}

// ─────────────────────────────────────────────────────────────────────
// Main handler — orchestrates all platforms
// ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notifications = await loadJsonOrEmpty<ReplyNotification[]>(
      REPLY_NOTIFICATIONS_PATH,
      []
    );
    const cursors = await loadJsonOrEmpty<ReplyCursors>(REPLY_CURSORS_PATH, {});
    const existingNotifIds = new Set(notifications.map((n) => n.id));

    const startCount = notifications.length;

    const reddit = await checkRedditReplies(notifications, existingNotifIds);
    const twitter = await checkTwitterReplies(notifications, existingNotifIds);
    const youtube = await checkYouTubeReplies(
      notifications,
      existingNotifIds,
      cursors
    );

    const totalNew = reddit.newReplies + twitter.newReplies + youtube.newReplies;

    if (totalNew > 0) {
      // Cap stored notifications at last 200
      const trimmed = notifications.slice(0, 200);
      await commitFile(
        REPLY_NOTIFICATIONS_PATH,
        JSON.stringify(trimmed, null, 2),
        `${totalNew} new comment replies detected`
      ).catch(() => {});

      // Telegram alert with platform breakdown
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const tgChat = process.env.TELEGRAM_OWNER_CHAT_ID;
      if (tgToken && tgChat) {
        const summaryLines: string[] = [];
        if (reddit.newReplies > 0)
          summaryLines.push(`Reddit: ${reddit.newReplies}`);
        if (twitter.newReplies > 0)
          summaryLines.push(`Twitter: ${twitter.newReplies}`);
        if (youtube.newReplies > 0)
          summaryLines.push(`YouTube: ${youtube.newReplies}`);
        const text = `💬 ${totalNew} new repl${totalNew === 1 ? "y" : "ies"} on your comments/posts!\n\n${summaryLines.join("\n")}\n\nCheck: r2ftrading.com/admin/engagement-log`;
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: tgChat, text }),
        }).catch(() => {});
      }
    }

    // Save cursors regardless (even on 0 new) so YT advances forward
    await commitFile(
      REPLY_CURSORS_PATH,
      JSON.stringify(cursors, null, 2),
      `Update reply cursors`
    ).catch(() => {});

    return NextResponse.json({
      totalNew,
      addedToStore: notifications.length - startCount,
      reddit,
      twitter,
      youtube,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
