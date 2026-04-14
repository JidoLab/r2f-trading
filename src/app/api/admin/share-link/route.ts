import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { generateOAuthHeader } from "@/lib/social-auth";
import { commitFile, readFile } from "@/lib/github";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { url, caption, platforms } = await req.json();
    if (!url || !caption) return NextResponse.json({ error: "URL and caption required" }, { status: 400 });

    const text = `${caption}\n\n${url}`;
    const results: { platform: string; status: string; error?: string }[] = [];
    const selectedPlatforms: string[] = platforms || ["twitter", "facebook", "linkedin", "telegram", "discord", "reddit"];

    // Twitter/X (280 char limit)
    if (selectedPlatforms.includes("twitter")) {
      try {
        const apiKey = process.env.TWITTER_API_KEY!;
        const apiSecret = process.env.TWITTER_API_SECRET!;
        const accessToken = process.env.TWITTER_ACCESS_TOKEN!;
        const accessSecret = process.env.TWITTER_ACCESS_SECRET!;
        if (apiKey && accessToken) {
          // Twitter counts URLs as 23 chars. Truncate caption if total would exceed 280.
          const urlLength = 23; // Twitter's t.co wraps all URLs to 23 chars
          const maxCaption = 280 - urlLength - 3; // 3 for "\n\n"
          const tweetCaption = caption.length > maxCaption ? caption.slice(0, maxCaption - 3) + "..." : caption;
          const tweetText = `${tweetCaption}\n\n${url}`;

          const auth = generateOAuthHeader("POST", "https://api.twitter.com/2/tweets", {}, apiKey, apiSecret, accessToken, accessSecret);
          const res = await fetch("https://api.twitter.com/2/tweets", {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ text: tweetText }),
          });
          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            results.push({ platform: "twitter", status: "error", error: `${res.status}: ${errText.slice(0, 80)}` });
          } else {
            results.push({ platform: "twitter", status: "success" });
          }
        }
      } catch (e: unknown) { results.push({ platform: "twitter", status: "error", error: e instanceof Error ? e.message.slice(0, 80) : "Unknown error" }); }
    }

    // Facebook
    if (selectedPlatforms.includes("facebook")) {
      try {
        const pageId = process.env.FACEBOOK_PAGE_ID;
        const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
        if (pageId && fbToken) {
          const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: caption, link: url, access_token: fbToken }),
          });
          results.push({ platform: "facebook", status: res.ok ? "success" : "error" });
        }
      } catch { results.push({ platform: "facebook", status: "error" }); }
    }

    // LinkedIn
    if (selectedPlatforms.includes("linkedin")) {
      try {
        const liToken = process.env.LINKEDIN_ACCESS_TOKEN;
        const personUrn = process.env.LINKEDIN_PERSON_URN;
        if (liToken && personUrn) {
          const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
            method: "POST",
            headers: { Authorization: `Bearer ${liToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              author: personUrn, lifecycleState: "PUBLISHED",
              specificContent: { "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: caption },
                shareMediaCategory: "ARTICLE",
                media: [{ status: "READY", originalUrl: url }],
              }},
              visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
            }),
          });
          results.push({ platform: "linkedin", status: res.ok ? "success" : "error" });
        }
      } catch { results.push({ platform: "linkedin", status: "error" }); }
    }

    // Telegram
    if (selectedPlatforms.includes("telegram")) {
      try {
        const tgToken = process.env.TELEGRAM_BOT_TOKEN;
        const tgChannel = process.env.TELEGRAM_CHANNEL_ID || "@r2ftradinginsights";
        if (tgToken) {
          const res = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: tgChannel, text, parse_mode: "Markdown", disable_web_page_preview: false }),
          });
          results.push({ platform: "telegram", status: res.ok ? "success" : "error" });
        }
      } catch { results.push({ platform: "telegram", status: "error" }); }
    }

    // Discord
    if (selectedPlatforms.includes("discord")) {
      try {
        const discordUrl = process.env.DISCORD_WEBHOOK_URL;
        if (discordUrl) {
          const res = await fetch(discordUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "R2F Trading", content: text }),
          });
          results.push({ platform: "discord", status: res.ok || res.status === 204 ? "success" : "error" });
        }
      } catch { results.push({ platform: "discord", status: "error" }); }
    }

    // Reddit
    if (selectedPlatforms.includes("reddit")) {
      try {
        const subreddit = process.env.REDDIT_SUBREDDIT;
        const clientId = process.env.REDDIT_CLIENT_ID;
        const clientSecret = process.env.REDDIT_CLIENT_SECRET;
        const refreshToken = process.env.REDDIT_REFRESH_TOKEN;
        const username = process.env.REDDIT_USERNAME;
        if (subreddit && clientId && clientSecret && refreshToken) {
          const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
            method: "POST",
            headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
          });
          if (tokenRes.ok) {
            const { access_token } = await tokenRes.json();
            const title = caption.split("\n")[0].slice(0, 100).replace(/#\w+/g, "").trim() || "Check this out";
            const res = await fetch("https://oauth.reddit.com/api/submit", {
              method: "POST",
              headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/x-www-form-urlencoded", "User-Agent": `R2FTrading/1.0 by ${username}` },
              body: new URLSearchParams({ api_type: "json", kind: "link", sr: subreddit, title, url }),
            });
            results.push({ platform: "reddit", status: res.ok ? "success" : "error" });
          }
        }
      } catch { results.push({ platform: "reddit", status: "error" }); }
    }

    // Log
    try {
      let log: unknown[] = [];
      try { log = JSON.parse(await readFile("data/social-log.json")); } catch {}
      log.push({ date: new Date().toISOString(), type: "link-share", url, caption: caption.slice(0, 80), results });
      if (log.length > 200) log = log.slice(-200);
      await commitFile("data/social-log.json", JSON.stringify(log, null, 2), `Share: ${url.slice(0, 40)}`);
    } catch {}

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
