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

    // --- Health Checks ---
    const healthChecks: { label: string; status: "ok" | "warn" | "error"; detail?: string }[] = [];

    // 1. Blog cron check
    if (blogPostsToday === 0) {
      healthChecks.push({ label: "Blog generation", status: "warn", detail: "No blog posts generated" });
    } else {
      healthChecks.push({ label: "Blog generation", status: "ok" });
    }

    // 2. Shorts cron check — look for error files in debug dir
    let shortsErrors = 0;
    try {
      const { listFiles: listGhFiles } = await import("@/lib/github");
      const debugFiles = await listGhFiles("data/shorts/debug");
      for (const file of debugFiles) {
        if (file.includes(today) || file.includes(yesterday)) shortsErrors++;
      }
    } catch {}
    if (shortsToday === 0) {
      healthChecks.push({ label: "Shorts pipeline", status: "warn", detail: "No shorts generated" });
    } else if (shortsErrors > 0) {
      healthChecks.push({ label: "Shorts pipeline", status: "warn", detail: `${shortsErrors} error file(s) found` });
    } else {
      healthChecks.push({ label: "Shorts pipeline", status: "ok" });
    }

    // 3. Social posting check
    if (socialTotal === 0) {
      healthChecks.push({ label: "Social posting", status: "warn", detail: "No social posts today" });
    } else {
      healthChecks.push({ label: "Social posting", status: "ok" });
    }

    // 4. Email drips check — subscribers stuck with no drips
    let stuckSubscribers = 0;
    try {
      const raw = await readFile("data/subscribers.json");
      const subs = JSON.parse(raw);
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
      stuckSubscribers = subs.filter(
        (s: { dripsSent?: number; date?: string }) =>
          (s.dripsSent === 0 || s.dripsSent === undefined) && s.date && s.date <= threeDaysAgo
      ).length;
    } catch {}
    if (stuckSubscribers > 0) {
      healthChecks.push({ label: "Email drips", status: "warn", detail: `${stuckSubscribers} subscriber(s) stuck with no drips` });
    } else {
      healthChecks.push({ label: "Email drips", status: "ok" });
    }

    // 5. Facebook token check
    try {
      const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      if (fbToken) {
        const fbRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${fbToken}`);
        if (!fbRes.ok) {
          healthChecks.push({ label: "Facebook token", status: "error", detail: "Token expired — refresh needed" });
        } else {
          healthChecks.push({ label: "Facebook token", status: "ok" });
        }
      } else {
        healthChecks.push({ label: "Facebook token", status: "warn", detail: "No token configured" });
      }
    } catch {
      healthChecks.push({ label: "Facebook token", status: "error", detail: "Token check failed" });
    }

    // 6. Shorts pipeline — videos stuck rendering > 24h
    let stuckRenders = 0;
    try {
      const { listFiles: listGhFiles } = await import("@/lib/github");
      const renderFiles = await listGhFiles("data/shorts/renders");
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
      for (const file of renderFiles) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = await readFile(file);
          const data = JSON.parse(raw);
          if (data.status === "rendering" && data.createdAt && data.createdAt < oneDayAgo) {
            stuckRenders++;
          }
        } catch {}
      }
    } catch {}
    if (stuckRenders > 0) {
      healthChecks.push({ label: "Render queue", status: "warn", detail: `${stuckRenders} video(s) stuck rendering` });
    }

    // Build health section string
    const healthLines = healthChecks.map((c) => {
      const icon = c.status === "ok" ? "✅" : c.status === "warn" ? "⚠️" : "🔴";
      return c.detail ? `${icon} ${c.label} — ${c.detail}` : `${icon} ${c.label}`;
    });
    const healthSection = `\n\n🏥 *System Health*\n${healthLines.join("\n")}`;

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
${healthSection}

🔗 [Open Dashboard](https://r2ftrading.com/admin-login)`;

    const sent = await sendTelegramReport(report);

    return NextResponse.json({ sent, stats: { blogPostsToday, shortsToday, totalSubscribers, newSubsToday } });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
