import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, listFiles } from "@/lib/github";
import { getAllPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  // Blog posts
  const posts = getAllPosts();
  const todayPosts = posts.filter(p => p.date >= new Date().toISOString().split("T")[0]).length;

  // Subscribers
  let totalSubs = 0, newSubsToday = 0, hotLeads = 0, warmLeads = 0;
  try {
    const raw = await readFile("data/subscribers.json");
    const subs = JSON.parse(raw);
    totalSubs = subs.length;
    newSubsToday = subs.filter((s: { date: string }) => s.date >= yesterday).length;
    hotLeads = subs.filter((s: { segment?: string }) => s.segment === "hot").length;
    warmLeads = subs.filter((s: { segment?: string }) => s.segment === "warm").length;
  } catch {}

  // Shorts
  let shortsReady = 0, shortsPublished = 0, shortsRendering = 0;
  try {
    const files = await listFiles("data/shorts/renders");
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(file);
        const data = JSON.parse(raw);
        if (data.status === "ready") shortsReady++;
        else if (data.status === "published") shortsPublished++;
        else if (data.status === "rendering") shortsRendering++;
      } catch {}
    }
  } catch {}

  // Chat conversations today
  let chatsToday = 0;
  try {
    const today = new Date().toISOString().split("T")[0];
    const raw = await readFile(`data/chat-transcripts/${today}.json`);
    chatsToday = Object.keys(JSON.parse(raw)).length;
  } catch {}

  // Social posts this week
  let socialThisWeek = 0;
  try {
    const raw = await readFile("data/social-log.json");
    const log = JSON.parse(raw);
    socialThisWeek = log.filter((l: { date: string }) => l.date >= weekAgo).length;
  } catch {}

  return NextResponse.json({
    posts: { total: posts.length, today: todayPosts, latest: posts[0] ? { title: posts[0].title, slug: posts[0].slug, date: posts[0].date } : null },
    subscribers: { total: totalSubs, newToday: newSubsToday, hot: hotLeads, warm: warmLeads },
    shorts: { ready: shortsReady, published: shortsPublished, rendering: shortsRendering },
    chatsToday,
    socialThisWeek,
  });
}
