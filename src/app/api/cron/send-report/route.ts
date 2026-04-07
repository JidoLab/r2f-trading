import { NextRequest, NextResponse } from "next/server";
import { readFile } from "@/lib/github";
import { sendEmail } from "@/lib/resend";
import { getAllPosts } from "@/lib/blog";

export const maxDuration = 60;

const BRAND = { navy: "#0d2137", gold: "#c9a84c", cream: "#f5f0e8" };
const OWNER_EMAIL = "road2funded@gmail.com";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    // Posts this week
    const posts = getAllPosts();
    const newPosts = posts.filter((p) => p.date >= oneWeekAgo);

    // Subscribers
    let totalSubscribers = 0;
    let newSubscribers = 0;
    try {
      const raw = await readFile("data/subscribers.json");
      const subs = JSON.parse(raw);
      totalSubscribers = subs.length;
      newSubscribers = subs.filter((s: { date: string }) => s.date >= oneWeekAgo).length;
    } catch { /* no subscribers yet */ }

    // Social log
    let socialPosts = 0;
    let socialSuccesses = 0;
    try {
      const raw = await readFile("data/social-log.json");
      const log = JSON.parse(raw);
      const weekLog = log.filter((l: { date: string }) => l.date >= oneWeekAgo);
      socialPosts = weekLog.length;
      socialSuccesses = weekLog.reduce((acc: number, l: { results: { status: string }[] }) =>
        acc + (l.results?.filter((r) => r.status === "success").length || 0), 0);
    } catch { /* no social log yet */ }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;">
  <div style="background:${BRAND.navy};padding:24px 32px;">
    <span style="font-size:24px;font-weight:900;color:#fff;">R<span style="color:${BRAND.gold}">2</span>F</span>
    <span style="font-size:10px;color:rgba(255,255,255,0.6);letter-spacing:3px;text-transform:uppercase;margin-left:6px;">Weekly Report</span>
  </div>
  <div style="padding:32px;">
    <h1 style="color:${BRAND.navy};font-size:20px;margin:0 0 24px;">Weekly Business Report</h1>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 0;color:#888;font-size:14px;">Blog Posts Published</td>
        <td style="padding:12px 0;text-align:right;font-size:24px;font-weight:900;color:${BRAND.navy};">${newPosts.length}</td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 0;color:#888;font-size:14px;">Total Blog Posts</td>
        <td style="padding:12px 0;text-align:right;font-size:24px;font-weight:900;color:${BRAND.navy};">${posts.length}</td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 0;color:#888;font-size:14px;">New Subscribers</td>
        <td style="padding:12px 0;text-align:right;font-size:24px;font-weight:900;color:${BRAND.gold};">${newSubscribers}</td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 0;color:#888;font-size:14px;">Total Subscribers</td>
        <td style="padding:12px 0;text-align:right;font-size:24px;font-weight:900;color:${BRAND.navy};">${totalSubscribers}</td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:12px 0;color:#888;font-size:14px;">Social Posts Sent</td>
        <td style="padding:12px 0;text-align:right;font-size:24px;font-weight:900;color:${BRAND.navy};">${socialPosts}</td>
      </tr>
      <tr>
        <td style="padding:12px 0;color:#888;font-size:14px;">Social Post Successes</td>
        <td style="padding:12px 0;text-align:right;font-size:24px;font-weight:900;color:${BRAND.gold};">${socialSuccesses}</td>
      </tr>
    </table>
    ${newPosts.length > 0 ? `<h3 style="color:${BRAND.navy};font-size:14px;margin:0 0 12px;">Posts This Week:</h3><ul style="padding-left:20px;margin:0 0 24px;">${newPosts.map((p) => `<li style="color:#555;font-size:13px;margin-bottom:6px;"><a href="https://r2ftrading.com/trading-insights/${p.slug}" style="color:${BRAND.gold};">${p.title}</a></li>`).join("")}</ul>` : ""}
    <div style="text-align:center;margin-top:20px;">
      <a href="https://r2ftrading.com/admin-login" style="display:inline-block;background:${BRAND.gold};color:${BRAND.navy};font-weight:700;font-size:13px;padding:12px 24px;text-decoration:none;border-radius:6px;">Open Admin Dashboard</a>
    </div>
  </div>
  <div style="background:${BRAND.cream};padding:16px 32px;text-align:center;font-size:11px;color:#aaa;">
    Automated report from R2F Trading · r2ftrading.com
  </div>
</div>
</body></html>`;

    await sendEmail(OWNER_EMAIL, `📈 R2F Weekly Report: ${newPosts.length} posts, ${newSubscribers} new subscribers`, html);

    // Also send via Telegram
    try {
      const { sendTelegramReport, thaiDate } = await import("@/lib/telegram-report");

      // Get additional stats for Telegram
      let hotLeads = 0, warmLeads = 0, shortsCount = 0;
      try {
        const subsRaw = await readFile("data/subscribers.json");
        const subs = JSON.parse(subsRaw);
        hotLeads = subs.filter((s: { segment?: string }) => s.segment === "hot").length;
        warmLeads = subs.filter((s: { segment?: string }) => s.segment === "warm").length;
      } catch {}
      try {
        const { listFiles } = await import("@/lib/github");
        const renderFiles = await listFiles("data/shorts/renders");
        for (const file of renderFiles) {
          if (!file.endsWith(".json")) continue;
          try {
            const raw = await readFile(file);
            const data = JSON.parse(raw);
            if (data.createdAt >= oneWeekAgo && data.status === "published") shortsCount++;
          } catch {}
        }
      } catch {}

      const tgReport = `📈 *R2F Weekly Report — ${thaiDate()}*

📝 *Content This Week*
• Blog posts: *${newPosts.length}*
• Shorts published: *${shortsCount}*
• Social posts: *${socialPosts}* (${socialSuccesses} successful)

👥 *Audience*
• New subscribers: *${newSubscribers}* (total: ${totalSubscribers})
• Hot leads: *${hotLeads}* 🔥
• Warm leads: *${warmLeads}*

📊 *Totals*
• Total blog posts: *${posts.length}*
• Total subscribers: *${totalSubscribers}*

${newPosts.length > 0 ? `📰 *Top Posts:*\n${newPosts.slice(0, 5).map(p => `• [${p.title}](https://r2ftrading.com/trading-insights/${p.slug})`).join("\n")}` : ""}

🔗 [Open Dashboard](https://r2ftrading.com/admin-login)`;

      await sendTelegramReport(tgReport);
    } catch {}

    return NextResponse.json({ sent: true, posts: newPosts.length, subscribers: totalSubscribers, newSubscribers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Report failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
