import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const redditLog: Record<string, unknown>[] = [];
  const twitterLog: Record<string, unknown>[] = [];
  const replyNotifications: Record<string, unknown>[] = [];

  try {
    const raw = await readFile("data/reddit-engage-log.json");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) redditLog.push(...parsed);
  } catch {}

  try {
    const raw = await readFile("data/twitter-engage-log.json");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) twitterLog.push(...parsed);
  } catch {}

  // Unified reply feed populated by /api/cron/check-comment-replies — covers
  // Reddit + Twitter + YouTube (any platform that publishes ReplyNotification
  // entries to data/reply-notifications.json).
  try {
    const raw = await readFile("data/reply-notifications.json");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) replyNotifications.push(...parsed);
  } catch {}

  // Sort by date descending
  redditLog.sort((a, b) => String(b.commentedAt || "").localeCompare(String(a.commentedAt || "")));
  twitterLog.sort((a, b) =>
    String(b.repliedAt || b.date || "").localeCompare(String(a.repliedAt || a.date || ""))
  );
  replyNotifications.sort((a, b) =>
    String(b.detectedAt || "").localeCompare(String(a.detectedAt || ""))
  );

  return NextResponse.json({
    reddit: redditLog,
    twitter: twitterLog,
    replies: replyNotifications,
    totals: {
      reddit: redditLog.length,
      twitter: twitterLog.length,
      replies: replyNotifications.length,
    },
  });
}
