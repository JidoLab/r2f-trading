import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const redditLog: Record<string, unknown>[] = [];
  const twitterLog: Record<string, unknown>[] = [];

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

  // Sort both by date descending
  redditLog.sort((a, b) => String(b.commentedAt || "").localeCompare(String(a.commentedAt || "")));
  twitterLog.sort((a, b) => String(b.repliedAt || "").localeCompare(String(a.repliedAt || "")));

  return NextResponse.json({
    reddit: redditLog,
    twitter: twitterLog,
    totals: { reddit: redditLog.length, twitter: twitterLog.length },
  });
}
