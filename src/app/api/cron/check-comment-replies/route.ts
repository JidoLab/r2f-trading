import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { getRedditAccessToken, getRedditUserAgent } from "@/lib/reddit-auth";

export const maxDuration = 30;

interface EngageLogEntry {
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

interface ReplyNotification {
  id: string;
  platform: string;
  postTitle: string;
  subreddit?: string;
  replyAuthor: string;
  replyText: string;
  commentUrl: string;
  detectedAt: string;
}

const REDDIT_LOG_PATH = "data/reddit-engage-log.json";
const REPLY_NOTIFICATIONS_PATH = "data/reply-notifications.json";

async function loadRedditLog(): Promise<EngageLogEntry[]> {
  try {
    return JSON.parse(await readFile(REDDIT_LOG_PATH));
  } catch {
    return [];
  }
}

async function loadNotifications(): Promise<ReplyNotification[]> {
  try {
    return JSON.parse(await readFile(REPLY_NOTIFICATIONS_PATH));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getRedditAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "No Reddit token" }, { status: 500 });
    }

    const ua = getRedditUserAgent();
    const log = await loadRedditLog();
    const notifications = await loadNotifications();
    const existingNotifIds = new Set(notifications.map(n => n.id));

    // Only check comments from last 14 days that don't already have a reply flagged
    const cutoff = Date.now() - 14 * 86400000;
    const toCheck = log.filter(entry =>
      entry.commentId &&
      !entry.hasReply &&
      new Date(entry.commentedAt).getTime() > cutoff
    );

    if (toCheck.length === 0) {
      return NextResponse.json({ checked: 0, newReplies: 0 });
    }

    // Batch fetch comment info — Reddit API allows up to 100 IDs at once
    const batch = toCheck.slice(0, 50);
    const ids = batch.map(e => `t1_${e.commentId}`).join(",");

    const res = await fetch(
      `https://oauth.reddit.com/api/info?id=${ids}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": ua,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Reddit API ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const comments = data?.data?.children || [];

    // Map comment IDs to their reply counts
    const replyMap = new Map<string, { replies: number }>();
    for (const c of comments) {
      if (c.data) {
        replyMap.set(c.data.id, {
          replies: c.data.num_comments || 0,
        });
      }
    }

    // Now check which comments have replies by fetching their children
    let newReplies = 0;
    let logUpdated = false;

    for (const entry of batch) {
      if (!entry.commentId || entry.hasReply) continue;

      // Fetch the comment's reply tree (just 1 level deep)
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

        // Reddit returns [post_listing, comment_listing]
        // The comment listing contains our comment with its replies
        const commentListing = commentData?.[1]?.data?.children || [];
        for (const c of commentListing) {
          if (c.data?.id === entry.commentId && c.data?.replies) {
            const replyChildren = c.data.replies?.data?.children || [];
            const actualReplies = replyChildren.filter(
              (r: { kind: string; data?: { author?: string } }) =>
                r.kind === "t1" && r.data?.author !== process.env.REDDIT_USERNAME
            );

            if (actualReplies.length > 0) {
              const firstReply = actualReplies[0].data;
              const replyAuthor = firstReply.author || "unknown";
              const replyText = (firstReply.body || "").slice(0, 300);
              const replyCreated = firstReply.created_utc
                ? new Date(firstReply.created_utc * 1000).toISOString()
                : new Date().toISOString();

              // Update the engage log entry
              const logIdx = log.findIndex(e => e.commentId === entry.commentId);
              if (logIdx >= 0) {
                log[logIdx].hasReply = true;
                log[logIdx].firstReplyAt = replyCreated;
                log[logIdx].firstReplyAuthor = replyAuthor;
                log[logIdx].firstReplyText = replyText;
                logUpdated = true;
              }

              // Add notification (only if not already notified)
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
          }
        }

        // Rate limit — small delay between requests
        await new Promise(r => setTimeout(r, 500));
      } catch {
        // Skip failed fetches, will retry next run
      }
    }

    // Save updates
    if (logUpdated) {
      await commitFile(
        REDDIT_LOG_PATH,
        JSON.stringify(log, null, 2),
        `Reply check: ${newReplies} new replies detected`
      ).catch(() => {});
    }

    if (newReplies > 0) {
      // Keep last 100 notifications
      const trimmed = notifications.slice(0, 100);
      await commitFile(
        REPLY_NOTIFICATIONS_PATH,
        JSON.stringify(trimmed, null, 2),
        `${newReplies} new comment replies detected`
      ).catch(() => {});

      // Telegram alert
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const tgChat = process.env.TELEGRAM_OWNER_CHAT_ID;
      if (tgToken && tgChat) {
        const summary = notifications
          .slice(0, newReplies)
          .map(n => `r/${n.subreddit}: u/${n.replyAuthor} replied to your comment on "${n.postTitle.slice(0, 50)}"`)
          .join("\n");

        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgChat,
            text: `💬 ${newReplies} new reply${newReplies > 1 ? "ies" : ""} to your comments!\n\n${summary}\n\nCheck: r2ftrading.com/admin/engagement-log`,
          }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      checked: batch.length,
      newReplies,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
