import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile, listFiles } from "@/lib/github";
import { getAllPosts } from "@/lib/blog";

export const maxDuration = 30;

function getBangkokDate(offset = 0): string {
  const d = new Date(Date.now() + offset * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = getBangkokDate();
    const weekAgo = getBangkokDate(-7);
    const twoWeeksAgo = getBangkokDate(-14);

    // --- Subscribers ---
    let subsTotal = 0, subsThisWeek = 0, subsLastWeek = 0;
    let hotLeads = 0, warmLeads = 0;
    try {
      const raw = await readFile("data/subscribers.json");
      const subs: Record<string, unknown>[] = JSON.parse(raw);
      subsTotal = subs.length;
      subsThisWeek = subs.filter(s => (s.date as string) >= weekAgo).length;
      subsLastWeek = subs.filter(s => (s.date as string) >= twoWeeksAgo && (s.date as string) < weekAgo).length;
      hotLeads = subs.filter(s => s.segment === "hot").length;
      warmLeads = subs.filter(s => s.segment === "warm").length;
    } catch {}

    // --- Payments ---
    let revenueThisWeek = 0, revenueLastWeek = 0, paymentsThisWeek = 0;
    try {
      const raw = await readFile("data/payments.json");
      const payments: Record<string, unknown>[] = JSON.parse(raw);
      for (const p of payments) {
        const amount = parseFloat(String(p.amount).replace(/[^0-9.]/g, "")) || 0;
        if ((p.date as string) >= weekAgo) { revenueThisWeek += amount; paymentsThisWeek++; }
        else if ((p.date as string) >= twoWeeksAgo) { revenueLastWeek += amount; }
      }
    } catch {}

    // --- Blog posts ---
    const posts = getAllPosts();
    const postsThisWeek = posts.filter(p => p.date >= weekAgo).length;
    const postsLastWeek = posts.filter(p => p.date >= twoWeeksAgo && p.date < weekAgo).length;

    // --- Shorts ---
    let shortsThisWeek = 0, shortsLastWeek = 0;
    try {
      const files = await listFiles("data/shorts/renders");
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = await readFile(file);
          const data = JSON.parse(raw);
          if (data.status === "published") {
            if ((data.publishedAt || data.createdAt || "") >= weekAgo) shortsThisWeek++;
            else if ((data.publishedAt || data.createdAt || "") >= twoWeeksAgo) shortsLastWeek++;
          }
        } catch {}
      }
    } catch {}

    // --- Social engagement ---
    let socialThisWeek = 0, socialLastWeek = 0;
    try {
      const raw = await readFile("data/social-log.json");
      const log: Record<string, unknown>[] = JSON.parse(raw);
      socialThisWeek = log.filter(l => (l.date as string) >= weekAgo).length;
      socialLastWeek = log.filter(l => (l.date as string) >= twoWeeksAgo && (l.date as string) < weekAgo).length;
    } catch {}

    // --- Reddit replies ---
    let repliesThisWeek = 0;
    try {
      const raw = await readFile("data/reply-notifications.json");
      const replies: Record<string, unknown>[] = JSON.parse(raw);
      repliesThisWeek = replies.filter(r => (r.detectedAt as string) >= weekAgo).length;
    } catch {}

    // --- Chat conversations ---
    let chatsThisWeek = 0;
    try {
      const chatFiles = await listFiles("data/chat-transcripts", ".json");
      for (const f of chatFiles) {
        if (f >= `data/chat-transcripts/${weekAgo}`) chatsThisWeek++;
      }
    } catch {}

    // --- Daily tasks consistency ---
    let taskCompletionRate = 0;
    try {
      const raw = await readFile("data/daily-tasks/history.json");
      const history: { date: string; completedCount: number; totalCount: number }[] = JSON.parse(raw);
      const thisWeekEntries = history.filter(h => h.date >= weekAgo);
      if (thisWeekEntries.length > 0) {
        const avgPct = thisWeekEntries.reduce((sum, h) =>
          sum + (h.totalCount > 0 ? h.completedCount / h.totalCount : 0), 0) / thisWeekEntries.length;
        taskCompletionRate = Math.round(avgPct * 100);
      }
    } catch {}

    // --- Build trend indicators ---
    function trend(current: number, previous: number): string {
      if (previous === 0 && current === 0) return "—";
      if (previous === 0) return `+${current} (new)`;
      const pct = Math.round(((current - previous) / previous) * 100);
      if (pct > 0) return `+${pct}%`;
      if (pct < 0) return `${pct}%`;
      return "flat";
    }

    // --- Save weekly snapshot ---
    const snapshot = {
      date: today,
      subscribers: { total: subsTotal, new: subsThisWeek, hot: hotLeads, warm: warmLeads },
      revenue: { amount: revenueThisWeek, payments: paymentsThisWeek },
      content: { posts: postsThisWeek, shorts: shortsThisWeek, social: socialThisWeek },
      engagement: { replies: repliesThisWeek, chats: chatsThisWeek },
      taskCompletionRate,
    };

    let snapshots: Record<string, unknown>[] = [];
    try {
      snapshots = JSON.parse(await readFile("data/weekly-snapshots.json"));
    } catch {}
    snapshots.unshift(snapshot);
    await commitFile(
      "data/weekly-snapshots.json",
      JSON.stringify(snapshots.slice(0, 52), null, 2),
      `Weekly snapshot: ${today}`
    ).catch(() => {});

    // --- Send Telegram report ---
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChat = process.env.TELEGRAM_OWNER_CHAT_ID;
    if (tgToken && tgChat) {
      const report = `📊 *R2F Weekly Health Report*
_Week ending ${today}_

👥 *Audience*
• Subscribers: *${subsTotal}* total (${trend(subsThisWeek, subsLastWeek)} this week: +${subsThisWeek})
• Hot leads: *${hotLeads}* | Warm: *${warmLeads}*

💰 *Revenue*
• This week: *$${revenueThisWeek.toFixed(0)}* (${paymentsThisWeek} payments)
• Last week: $${revenueLastWeek.toFixed(0)} (${trend(revenueThisWeek, revenueLastWeek)})

📝 *Content Output*
• Blog posts: *${postsThisWeek}* (${trend(postsThisWeek, postsLastWeek)} vs last week)
• Shorts published: *${shortsThisWeek}* (${trend(shortsThisWeek, shortsLastWeek)})
• Social posts: *${socialThisWeek}* (${trend(socialThisWeek, socialLastWeek)})

💬 *Engagement*
• Comment replies: *${repliesThisWeek}*
• Chat conversations: *${chatsThisWeek}*

✅ *Task Consistency*
• Avg daily completion: *${taskCompletionRate}%*

🔗 [Open Dashboard](https://r2ftrading.com/admin)`;

      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: tgChat, text: report, parse_mode: "Markdown" }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, snapshot });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
