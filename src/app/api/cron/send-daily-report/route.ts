import { NextRequest, NextResponse } from "next/server";
import { readFile } from "@/lib/github";
import { sendTelegramReport, thaiDate } from "@/lib/telegram-report";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Blog posts today
    let blogPostsToday = 0;
    let totalPosts = 0;
    try {
      const { getAllPosts } = await import("@/lib/blog");
      const posts = getAllPosts();
      totalPosts = posts.length;
      blogPostsToday = posts.filter(p => p.date >= yesterday).length;
    } catch {}

    // Subscribers
    let totalSubscribers = 0;
    let newSubsToday = 0;
    let hotLeads = 0;
    let warmLeads = 0;
    try {
      const raw = await readFile("data/subscribers.json");
      const subs = JSON.parse(raw);
      totalSubscribers = subs.length;
      newSubsToday = subs.filter((s: { date: string }) => s.date >= yesterday).length;
      hotLeads = subs.filter((s: { segment?: string }) => s.segment === "hot").length;
      warmLeads = subs.filter((s: { segment?: string }) => s.segment === "warm").length;
    } catch {}

    // Shorts generated today
    let shortsToday = 0;
    let shortsPublished = 0;
    try {
      const files = (await import("@/lib/github")).listFiles;
      const renderFiles = await files("data/shorts/renders");
      for (const file of renderFiles) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = await readFile(file);
          const data = JSON.parse(raw);
          if (data.createdAt >= yesterday) {
            shortsToday++;
            if (data.status === "published") shortsPublished++;
          }
        } catch {}
      }
    } catch {}

    // Social posts today
    let socialSuccess = 0;
    let socialTotal = 0;
    try {
      const raw = await readFile("data/social-log.json");
      const log = JSON.parse(raw);
      const todayLog = log.filter((l: { date: string }) => l.date >= yesterday);
      socialTotal = todayLog.length;
      socialSuccess = todayLog.reduce((acc: number, l: { results: { status: string }[] }) =>
        acc + (l.results?.filter(r => r.status === "success").length || 0), 0);
    } catch {}

    // Chat conversations today
    let chatsToday = 0;
    try {
      const raw = await readFile(`data/chat-transcripts/${today}.json`);
      const chats = JSON.parse(raw);
      chatsToday = Object.keys(chats).length;
    } catch {}

    const report = `📊 *R2F Daily Report — ${thaiDate()}*

📝 *Content*
• Blog posts today: *${blogPostsToday}* (total: ${totalPosts})
• Shorts generated: *${shortsToday}* (published: ${shortsPublished})
• Social posts: *${socialSuccess}/${socialTotal}* successful

👥 *Audience*
• New subscribers: *${newSubsToday}* (total: ${totalSubscribers})
• Hot leads: *${hotLeads}* 🔥
• Warm leads: *${warmLeads}*

💬 *Engagement*
• Chatbot conversations: *${chatsToday}*

🔗 [Open Dashboard](https://r2ftrading.com/admin-login)`;

    const sent = await sendTelegramReport(report);

    return NextResponse.json({ sent, stats: { blogPostsToday, shortsToday, totalSubscribers, newSubsToday } });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
