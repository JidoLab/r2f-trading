import { NextRequest, NextResponse } from "next/server";
import { readFile } from "@/lib/github";
import { sendEmail } from "@/lib/resend";
import { getAllPosts } from "@/lib/blog";

export const maxDuration = 60;

const BRAND = {
  navy: "#0d2137",
  gold: "#c9a84c",
  cream: "#f5f0e8",
  url: "https://r2ftrading.com",
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get subscribers
    let subscribers: { email: string; date: string; dripsSent: number }[] = [];
    try {
      const raw = await readFile("data/subscribers.json");
      subscribers = JSON.parse(raw);
    } catch {
      return NextResponse.json({ sent: 0, message: "No subscribers" });
    }

    // Get latest 3 posts from the past 7 days
    const posts = getAllPosts();
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const recentPosts = posts.filter((p) => p.date >= oneWeekAgo).slice(0, 3);

    if (recentPosts.length === 0) {
      return NextResponse.json({ sent: 0, message: "No new posts this week" });
    }

    const postCards = recentPosts.map((p) => `
      <div style="margin-bottom:20px;border:1px solid #eee;border-radius:8px;overflow:hidden;">
        ${p.coverImage ? `<img src="${BRAND.url}${p.coverImage}" alt="${p.title}" style="width:100%;height:180px;object-fit:cover;" />` : ""}
        <div style="padding:16px;">
          <h3 style="margin:0 0 8px;color:${BRAND.navy};font-size:16px;">${p.title}</h3>
          <p style="margin:0 0 12px;color:#666;font-size:13px;line-height:1.5;">${p.excerpt}</p>
          <a href="${BRAND.url}/trading-insights/${p.slug}" style="color:${BRAND.gold};font-weight:700;font-size:13px;text-decoration:none;">Read Article →</a>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;">
  <div style="background:${BRAND.navy};padding:24px 32px;">
    <span style="font-size:24px;font-weight:900;color:#fff;">R<span style="color:${BRAND.gold}">2</span>F</span>
    <span style="font-size:10px;color:rgba(255,255,255,0.6);letter-spacing:3px;text-transform:uppercase;margin-left:6px;">Weekly Insights</span>
  </div>
  <div style="padding:32px;">
    <h1 style="color:${BRAND.navy};font-size:22px;margin:0 0 8px;">This Week's Trading Insights</h1>
    <p style="color:#888;font-size:13px;margin:0 0 24px;">Fresh content from R2F Trading to sharpen your edge.</p>
    ${postCards}
    <div style="text-align:center;margin:28px 0 16px;">
      <a href="${BRAND.url}/trading-insights" style="display:inline-block;background:${BRAND.gold};color:${BRAND.navy};font-weight:700;font-size:14px;padding:14px 28px;text-decoration:none;border-radius:6px;text-transform:uppercase;letter-spacing:1px;">View All Articles</a>
    </div>
  </div>
  <div style="background:${BRAND.cream};padding:20px 32px;text-align:center;font-size:12px;color:#888;">
    <p>&copy; ${new Date().getFullYear()} R2F Trading · <a href="${BRAND.url}" style="color:${BRAND.gold};">r2ftrading.com</a></p>
    <p>You received this because you signed up at r2ftrading.com</p>
  </div>
</div>
</body></html>`;

    let sent = 0;
    for (const sub of subscribers) {
      if (sent >= 90) break;
      try {
        await sendEmail(sub.email, `📊 This Week's ICT Trading Insights — R2F Trading`, html);
        sent++;
      } catch { /* skip failed */ }
    }

    return NextResponse.json({ sent, total: subscribers.length, posts: recentPosts.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Newsletter failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
