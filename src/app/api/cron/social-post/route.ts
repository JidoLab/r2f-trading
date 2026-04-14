import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 90;

const POST_TYPES = [
  { id: "question", prompt: "Ask an engaging question that makes traders think and comment. Example: 'What's the ONE rule you'd give a beginner trader?' or 'Would you rather have an 80% win rate with 1:1 RR or 40% win rate with 1:4 RR?'" },
  { id: "poll", prompt: "Write a poll/this-or-that question. Format: state the question then list 2-4 options with emojis. Example: 'Your worst trading habit? 🅰️ Overtrading 🅱️ Moving stop loss 🅲️ FOMO entries 🅳️ Revenge trading'" },
  { id: "hot-take", prompt: "Share a controversial or spicy trading opinion that will generate debate. Something most traders disagree on. Example: 'Unpopular opinion: Backtesting is overrated. Here's why...' Keep it under 200 characters for maximum engagement." },
  { id: "quote", prompt: "Share an inspirational or thought-provoking trading quote. Can be original or attributed. Add a short 1-line commentary. Example: '\"The goal of a successful trader is to make the best trades. Money is secondary.\" — This hit different when I finally understood it.'" },
  { id: "tip", prompt: "Share a quick actionable trading tip in 1-3 sentences. Something immediately useful. Example: 'Quick tip: Before every trade, ask yourself — am I chasing this or did I plan it? If you can't answer in 2 seconds, skip the trade.'" },
  { id: "myth", prompt: "Bust a common trading myth in a punchy way. Format: 'MYTH: [common belief]. TRUTH: [reality].' Example: 'MYTH: You need a 90% win rate. TRUTH: Some of the best traders win only 40% of the time — it's all about risk-reward.'" },
  { id: "story", prompt: "Share a very short trading story or lesson (3-4 sentences). Personal, relatable, ends with a takeaway. Example: 'I once held a losing trade for 3 hours hoping it would come back. It didn't. That one trade taught me more about discipline than 6 months of courses.'" },
  { id: "challenge", prompt: "Issue a mini challenge to traders. Example: 'Challenge: For the next 5 trading days, only take 1 trade per session. Just one. See what happens to your win rate. Drop your results below 👇'" },
  // Promotional — rotate in naturally (link to value pages)
  { id: "promo-free-class", prompt: "Promote the free ICT trading class in an exciting, non-spammy way. Mention what they'll learn (3 setups that work, funded account blueprint, trading psychology). Include the link: https://r2ftrading.com/free-class. Example: 'I'm doing a free class on the 3 ICT setups that got my students funded. No fluff, just the framework. Grab your spot 👇 https://r2ftrading.com/free-class'" },
  { id: "promo-results", prompt: "Share a student result or success stat and link to the results page. Make it feel like a genuine brag/celebration, not an ad. Include: https://r2ftrading.com/results. Example: '85% of my students pass their funded challenge. That's not luck — that's structure. See the results 👇 https://r2ftrading.com/results'" },
  { id: "promo-checklist", prompt: "Promote the free ICT Trading Checklist in a value-first way. Mention it's the exact checklist used before every trade. Include: https://r2ftrading.com. Example: 'I use this checklist before every single trade. Pre-trade, during, post-trade — it keeps me disciplined. Grab it free 👇 https://r2ftrading.com'" },
  { id: "promo-blog", prompt: "Tease an interesting trading insight and link to the blog. Don't name a specific post — just drive curiosity. Include: https://r2ftrading.com/trading-insights. Example: 'I wrote about why most traders blow their first funded account within 2 weeks. The fix is simpler than you think. Read it 👇 https://r2ftrading.com/trading-insights'" },
  { id: "promo-coaching", prompt: "Soft-promote coaching availability. Mention limited spots, personalized approach, free discovery call. Include: https://r2ftrading.com/contact. Example: 'I have 3 coaching spots open this month. If you're serious about getting funded, book a free 15-min call. No pitch, just real talk. 👇 https://r2ftrading.com/contact'" },
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Track which types we've used recently for rotation
    let recentTypes: string[] = [];
    try {
      const raw = await readFile("data/social-text-tracker.json");
      recentTypes = JSON.parse(raw).recentTypes || [];
    } catch {}

    // Pick a type we haven't used recently
    const typeCounts: Record<string, number> = {};
    for (const t of recentTypes.slice(-20)) typeCounts[t] = (typeCounts[t] || 0) + 1;
    const sorted = [...POST_TYPES].sort((a, b) => (typeCounts[a.id] || 0) - (typeCounts[b.id] || 0));
    const postType = sorted[0];

    // Get market context
    let marketContext = "";
    try {
      const { buildMarketContext } = await import("@/lib/market-trends");
      marketContext = await buildMarketContext();
    } catch {}

    // Generate the post with Claude
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `You are the social media voice for R2F Trading (ICT trading coaching by Harvest Wright).
Write a ${postType.id.toUpperCase()} post for Twitter/X and social media.

${postType.prompt}

${marketContext ? `If any trending/timely topic is relevant, incorporate it:\n${marketContext}` : ""}

RULES:
- Sound like a real trader talking to other traders, NOT an AI
- Casual, confident, slightly edgy tone
- NEVER use the word "journey"
- Keep it under 280 characters for Twitter compatibility
- Include 2-3 relevant hashtags at the end
- Don't start with "Hey traders" or any generic greeting
- Make people want to reply, retweet, or save the post
- Mention "R2F Trading" or "follow for more" naturally if it fits, but don't force it

Return ONLY a JSON object:
{"text": "the post text with hashtags", "type": "${postType.id}"}`,
      }],
    });

    let text = response.content[0].type === "text" ? response.content[0].text : "";
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON in response");
    const post = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

    // For visual post types, generate a branded image via the quote-card/infographic route
    const IMAGE_POST_TYPES = ["tip", "myth", "quote", "hot-take"];
    let socialImageUrl: string | null = null;

    if (IMAGE_POST_TYPES.includes(postType.id)) {
      try {
        const timestamp = Date.now();
        // Extract a short title from the post text (first line or first 60 chars)
        const imageTitle = post.text.split("\n")[0].replace(/#\w+/g, "").trim().slice(0, 80);
        const params = new URLSearchParams({
          title: imageTitle,
          type: postType.id,
        });
        const imageRouteUrl = `https://r2ftrading.com/quote-card/social-${timestamp}?${params.toString()}`;

        const imgRes = await fetch(imageRouteUrl, { signal: AbortSignal.timeout(15000) });
        if (imgRes.ok) {
          // Store the image to GitHub so it has a persistent URL
          const imgBuffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(imgBuffer).toString("base64");
          const imgPath = `public/social-images/social-${timestamp}.png`;
          await commitFile(imgPath, base64, `Social image: ${postType.id}`, true);
          socialImageUrl = `https://r2ftrading.com/social-images/social-${timestamp}.png`;
          console.log(`[social-cron] Generated image for ${postType.id}: ${socialImageUrl}`);
        }
      } catch (imgErr) {
        console.error("[social-cron] Image generation error:", imgErr);
        // Continue without image — text-only is fine
      }
    }

    // Post to all text-friendly platforms
    const results: { platform: string; status: string }[] = [];

    // Twitter/X — use image tweet if we have an image, otherwise text-only
    try {
      if (socialImageUrl) {
        const { postTweetWithImage } = await import("@/lib/social");
        const imgResult = await postTweetWithImage(post.text, socialImageUrl);
        results.push({ platform: "twitter", status: imgResult.status });
      } else {
        const { generateOAuthHeader } = await import("@/lib/social-auth");
        const apiKey = process.env.TWITTER_API_KEY!;
        const apiSecret = process.env.TWITTER_API_SECRET!;
        const accessToken = process.env.TWITTER_ACCESS_TOKEN!;
        const accessSecret = process.env.TWITTER_ACCESS_SECRET!;
        if (apiKey && accessToken) {
          const auth = generateOAuthHeader("POST", "https://api.twitter.com/2/tweets", {}, apiKey, apiSecret, accessToken, accessSecret);
          const res = await fetch("https://api.twitter.com/2/tweets", {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ text: post.text }),
          });
          results.push({ platform: "twitter", status: res.ok ? "success" : "error" });
        }
      }
    } catch { results.push({ platform: "twitter", status: "error" }); }

    // Facebook — use photo post if image available (higher reach)
    try {
      const pageId = process.env.FACEBOOK_PAGE_ID;
      const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      if (pageId && fbToken) {
        let fbOk = false;
        if (socialImageUrl) {
          const photoRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: socialImageUrl, message: post.text, access_token: fbToken }),
          });
          fbOk = photoRes.ok;
        }
        if (!fbOk) {
          const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: post.text, access_token: fbToken }),
          });
          fbOk = res.ok;
        }
        results.push({ platform: "facebook", status: fbOk ? "success" : "error" });
      }
    } catch { results.push({ platform: "facebook", status: "error" }); }

    // LinkedIn
    try {
      const liToken = process.env.LINKEDIN_ACCESS_TOKEN;
      const personUrn = process.env.LINKEDIN_PERSON_URN;
      if (liToken && personUrn) {
        const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: { Authorization: `Bearer ${liToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            author: personUrn, lifecycleState: "PUBLISHED",
            specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: post.text }, shareMediaCategory: "NONE" } },
            visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
          }),
        });
        results.push({ platform: "linkedin", status: res.ok ? "success" : "error" });
      }
    } catch { results.push({ platform: "linkedin", status: "error" }); }

    // Telegram
    try {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const tgChannel = process.env.TELEGRAM_CHANNEL_ID || "@r2ftradinginsights";
      if (tgToken) {
        const res = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: tgChannel, text: post.text, parse_mode: "Markdown" }),
        });
        results.push({ platform: "telegram", status: res.ok ? "success" : "error" });
      }
    } catch { results.push({ platform: "telegram", status: "error" }); }

    // Discord
    try {
      const discordUrl = process.env.DISCORD_WEBHOOK_URL;
      if (discordUrl) {
        const res = await fetch(discordUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "R2F Trading", content: post.text }),
        });
        results.push({ platform: "discord", status: res.ok || res.status === 204 ? "success" : "error" });
      }
    } catch { results.push({ platform: "discord", status: "error" }); }

    // Reddit (text post in subreddit)
    try {
      const subreddit = process.env.REDDIT_SUBREDDIT;
      const clientId = process.env.REDDIT_CLIENT_ID;
      const clientSecret = process.env.REDDIT_CLIENT_SECRET;
      const refreshToken = process.env.REDDIT_REFRESH_TOKEN;
      const username = process.env.REDDIT_USERNAME;
      if (subreddit && clientId && clientSecret && refreshToken) {
        // Get access token
        const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
          method: "POST",
          headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
        });
        if (tokenRes.ok) {
          const { access_token } = await tokenRes.json();
          const title = post.text.split("\n")[0].slice(0, 100).replace(/#\w+/g, "").trim();
          const res = await fetch("https://oauth.reddit.com/api/submit", {
            method: "POST",
            headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/x-www-form-urlencoded", "User-Agent": `R2FTrading/1.0 by ${username}` },
            body: new URLSearchParams({ api_type: "json", kind: "self", sr: subreddit, title: title || "Trading Insight", text: post.text }),
          });
          results.push({ platform: "reddit", status: res.ok ? "success" : "error" });
        }
      }
    } catch { results.push({ platform: "reddit", status: "error" }); }

    // Update tracker
    recentTypes.push(postType.id);
    if (recentTypes.length > 30) recentTypes = recentTypes.slice(-30);
    await commitFile("data/social-text-tracker.json", JSON.stringify({ recentTypes, lastPost: { type: postType.id, text: post.text, date: new Date().toISOString() } }, null, 2), `Social: ${postType.id}`).catch(() => {});

    // Log
    try {
      let log: unknown[] = [];
      try { log = JSON.parse(await readFile("data/social-log.json")); } catch {}
      log.push({ date: new Date().toISOString(), type: "text", postType: postType.id, text: post.text.slice(0, 100), hasImage: !!socialImageUrl, results });
      if (log.length > 200) log = log.slice(-200);
      await commitFile("data/social-log.json", JSON.stringify(log, null, 2), `Social text: ${postType.id}`);
    } catch {}

    const succeeded = results.filter(r => r.status === "success").length;
    return NextResponse.json({ success: true, type: postType.id, text: post.text, hasImage: !!socialImageUrl, platforms: succeeded, results });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
