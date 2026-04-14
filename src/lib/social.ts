import { generateOAuthHeader } from "./social-auth";
import { commitFile, readFile } from "./github";

const SITE_URL = "https://r2ftrading.com";

interface PostData {
  title: string;
  excerpt: string;
  slug: string;
  coverImage: string;
  tags: string[];
}

interface SocialResult {
  platform: string;
  status: "success" | "skipped" | "error";
  message?: string;
}

// --- Twitter/X ---
async function postToTwitter(post: PostData): Promise<SocialResult> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return { platform: "twitter", status: "skipped", message: "No credentials" };
  }

  const url = `${SITE_URL}/trading-insights/${post.slug}`;
  const hashtags = post.tags.slice(0, 2).map((t) => `#${t.replace(/[^a-zA-Z0-9]/g, "")}`).join(" ");
  const tweetText = `${post.title}\n\n${post.excerpt.slice(0, 140)}...\n\n${url}\n\n${hashtags} #ICTTrading`;

  // Truncate to 280 chars
  const tweet = tweetText.length > 280 ? tweetText.slice(0, 277) + "..." : tweetText;

  const apiUrl = "https://api.twitter.com/2/tweets";
  const body = JSON.stringify({ text: tweet });

  const authHeader = generateOAuthHeader(
    "POST", apiUrl, {}, apiKey, apiSecret, accessToken, accessSecret
  );

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body,
  });

  if (res.ok) return { platform: "twitter", status: "success" };
  const err = await res.text();
  return { platform: "twitter", status: "error", message: err.slice(0, 200) };
}

// --- Facebook Page ---
async function postToFacebook(post: PostData): Promise<SocialResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !token) {
    return { platform: "facebook", status: "skipped", message: "No credentials" };
  }

  const url = `${SITE_URL}/trading-insights/${post.slug}`;
  const message = `📊 ${post.title}\n\n${post.excerpt}\n\n👉 Read more: ${url}\n\n#ICTTrading #ForexEducation #R2FTrading`;

  // If cover image exists, post as photo with caption (shows the article image prominently)
  if (post.coverImage) {
    const imageUrl = `${SITE_URL}${post.coverImage}`;
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/photos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl, message, access_token: token }),
      }
    );
    if (res.ok) return { platform: "facebook", status: "success" };
    // Fall through to link post if photo upload fails
  }

  // Fallback: link post without image
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}/feed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, link: url, access_token: token }),
    }
  );

  if (res.ok) return { platform: "facebook", status: "success" };
  const err = await res.text();
  return { platform: "facebook", status: "error", message: err.slice(0, 200) };
}

// --- Instagram ---
async function postToInstagram(post: PostData): Promise<SocialResult> {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN; // Same token for Instagram Graph API

  if (!accountId || !token || !post.coverImage) {
    return { platform: "instagram", status: "skipped", message: "No credentials or cover image" };
  }

  const imageUrl = `${SITE_URL}${post.coverImage}`;
  const caption = `${post.title}\n\n${post.excerpt}\n\n🔗 Link in bio\n\n#ICTTrading #ForexEducation #TradingMentorship #R2FTrading #FundedTrader ${post.tags.map((t) => `#${t.replace(/[^a-zA-Z0-9]/g, "")}`).join(" ")}`;

  // Step 1: Create media container
  const createRes = await fetch(
    `https://graph.facebook.com/v21.0/${accountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
    }
  );

  if (!createRes.ok) {
    const err = await createRes.text();
    return { platform: "instagram", status: "error", message: err.slice(0, 200) };
  }

  const { id: containerId } = await createRes.json();

  // Step 2: Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${accountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId, access_token: token }),
    }
  );

  if (publishRes.ok) return { platform: "instagram", status: "success" };
  const err = await publishRes.text();
  return { platform: "instagram", status: "error", message: err.slice(0, 200) };
}

// --- LinkedIn ---
async function postToLinkedIn(post: PostData): Promise<SocialResult> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!token || !personUrn) {
    return { platform: "linkedin", status: "skipped", message: "No credentials" };
  }

  const url = `${SITE_URL}/trading-insights/${post.slug}`;
  const body = {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: `${post.title}\n\n${post.excerpt}\n\n#ICTTrading #TradingEducation #R2FTrading` },
        shareMediaCategory: "ARTICLE",
        media: [
          {
            status: "READY",
            originalUrl: url,
            title: { text: post.title },
            description: { text: post.excerpt },
            ...(post.coverImage ? { thumbnails: [{ url: `${SITE_URL}${post.coverImage}` }] } : {}),
          },
        ],
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (res.ok) return { platform: "linkedin", status: "success" };
  const err = await res.text();
  return { platform: "linkedin", status: "error", message: err.slice(0, 200) };
}

// --- Reddit ---
async function getRedditAccessToken(): Promise<string | null> {
  const refreshToken = process.env.REDDIT_REFRESH_TOKEN;
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!refreshToken || !clientId) return null;

  const auth = Buffer.from(`${clientId}:${clientSecret || ""}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "R2FTradingBot/1.0",
    },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

async function postToReddit(post: PostData): Promise<SocialResult[]> {
  const subreddit = process.env.REDDIT_SUBREDDIT || "Road2Funded";
  const username = process.env.REDDIT_USERNAME || "Front-Recording7391";

  const accessToken = await getRedditAccessToken();
  if (!accessToken) {
    return [{ platform: "reddit", status: "skipped", message: "No credentials" }];
  }

  const url = `${SITE_URL}/trading-insights/${post.slug}`;
  const postText = `## ${post.title}\n\n${post.excerpt}\n\n---\n\n🔗 **Read the full article:** [${post.title}](${url})\n\n*Join r/${subreddit} for daily ICT trading insights, market analysis, and mentorship updates.*`;

  const results: SocialResult[] = [];

  // Post to subreddit
  try {
    const res = await fetch("https://oauth.reddit.com/api/submit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "R2FTradingBot/1.0",
      },
      body: new URLSearchParams({
        sr: subreddit,
        kind: "self",
        title: post.title,
        text: postText,
        sendreplies: "true",
      }).toString(),
    });
    const data = await res.json();
    if (data?.success || !data?.json?.errors?.length) {
      results.push({ platform: "reddit-sub", status: "success" });
    } else {
      results.push({ platform: "reddit-sub", status: "error", message: JSON.stringify(data?.json?.errors).slice(0, 200) });
    }
  } catch (err) {
    results.push({ platform: "reddit-sub", status: "error", message: String(err).slice(0, 200) });
  }

  // Post to personal profile (u/username)
  try {
    const res = await fetch("https://oauth.reddit.com/api/submit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "R2FTradingBot/1.0",
      },
      body: new URLSearchParams({
        sr: `u_${username}`,
        kind: "self",
        title: post.title,
        text: postText,
        sendreplies: "true",
      }).toString(),
    });
    const data = await res.json();
    if (data?.success || !data?.json?.errors?.length) {
      results.push({ platform: "reddit-profile", status: "success" });
    } else {
      results.push({ platform: "reddit-profile", status: "error", message: JSON.stringify(data?.json?.errors).slice(0, 200) });
    }
  } catch (err) {
    results.push({ platform: "reddit-profile", status: "error", message: String(err).slice(0, 200) });
  }

  return results;
}

// --- Pinterest ---
async function postToPinterest(post: PostData): Promise<SocialResult> {
  const token = process.env.PINTEREST_ACCESS_TOKEN;

  if (!token || !post.coverImage) {
    return { platform: "pinterest", status: "skipped", message: "No token or cover image" };
  }

  const url = `${SITE_URL}/trading-insights/${post.slug}`;
  const imageUrl = `${SITE_URL}${post.coverImage}`;

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: post.title,
      description: `${post.excerpt}\n\n#ICTTrading #ForexEducation #TradingMentorship #R2FTrading #FundedTrader ${post.tags.map((t) => `#${t.replace(/[^a-zA-Z0-9]/g, "")}`).join(" ")}`,
      link: url,
      media_source: {
        source_type: "image_url",
        url: imageUrl,
      },
      board_id: process.env.PINTEREST_BOARD_ID || "",
    }),
  });

  if (res.ok) return { platform: "pinterest", status: "success" };
  const err = await res.text();
  return { platform: "pinterest", status: "error", message: err.slice(0, 200) };
}

// --- Telegram Channel ---
async function postToTelegram(post: PostData): Promise<SocialResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID || "@r2ftradinginsights";

  if (!botToken) {
    return { platform: "telegram", status: "skipped", message: "No bot token" };
  }

  const url = `${SITE_URL}/trading-insights/${post.slug}`;
  const caption = `📊 *${post.title}*\n\n${post.excerpt}\n\n👉 [Read Full Article](${url})\n\n#ICTTrading #R2FTrading #ForexEducation`;

  // Send as photo with caption if cover image exists
  if (post.coverImage) {
    const photoRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendPhoto`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: `${SITE_URL}${post.coverImage}`,
          caption,
          parse_mode: "Markdown",
        }),
      }
    );
    if (photoRes.ok) return { platform: "telegram", status: "success" };
    // Fall through to text-only if photo fails
  }

  // Fallback: text only
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: caption,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    }
  );

  if (res.ok) return { platform: "telegram", status: "success" };
  const err = await res.text();
  return { platform: "telegram", status: "error", message: err.slice(0, 200) };
}

// --- Discord ---
async function postToDiscord(post: PostData): Promise<SocialResult> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    return { platform: "discord", status: "skipped", message: "No webhook URL" };
  }

  const url = `${SITE_URL}/trading-insights/${post.slug}`;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "R2F Trading",
      embeds: [
        {
          title: post.title,
          url,
          description: post.excerpt,
          color: 0xc9a84c, // gold
          image: post.coverImage ? { url: `${SITE_URL}${post.coverImage}` } : undefined,
          footer: { text: `r2ftrading.com · ${post.tags.join(" · ")}` },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (res.ok || res.status === 204) return { platform: "discord", status: "success" };
  const err = await res.text();
  return { platform: "discord", status: "error", message: err.slice(0, 200) };
}

// --- LinkedIn Native Article (full text post, not link share) ---
export async function postLinkedInArticle(
  title: string,
  articleBody: string,
  articleUrl: string
): Promise<SocialResult> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!token || !personUrn) {
    return { platform: "linkedin-article", status: "skipped", message: "No credentials" };
  }

  // Use Claude to shorten the article to 500-800 words for LinkedIn
  let shortenedText: string;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic();
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `Shorten this trading article to 500-800 words for a LinkedIn post. Keep the key insights, actionable advice, and personal voice. Remove markdown formatting (no ##, no **, no []() links). Use plain text with line breaks between sections. Keep it conversational and valuable — this should feel like a native LinkedIn post, not a blog excerpt.

TITLE: ${title}

ARTICLE:
${articleBody.slice(0, 8000)}

Return ONLY the shortened article text, nothing else.`,
      }],
    });
    shortenedText = res.content[0].type === "text" ? res.content[0].text.trim() : "";
  } catch {
    // Fallback: take first ~700 words of the article, strip markdown
    shortenedText = articleBody
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
      .split(/\s+/)
      .slice(0, 700)
      .join(" ");
  }

  if (!shortenedText) {
    return { platform: "linkedin-article", status: "error", message: "Failed to shorten article" };
  }

  const postText = `${title}\n\n${shortenedText}\n\n---\nRead the full article: ${articleUrl}\n\n#ICTTrading #TradingEducation #ForexTrading #R2FTrading`;

  // LinkedIn UGC API — native text post (no link card, just text)
  const body = {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: postText },
        shareMediaCategory: "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (res.ok) return { platform: "linkedin-article", status: "success" };
  const err = await res.text();
  return { platform: "linkedin-article", status: "error", message: err.slice(0, 200) };
}

// --- Twitter/X Image Upload + Tweet ---
export async function postTweetWithImage(
  text: string,
  imageUrl: string
): Promise<SocialResult> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return { platform: "twitter-image", status: "skipped", message: "No credentials" };
  }

  try {
    // Step 1: Download the image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return { platform: "twitter-image", status: "error", message: `Image fetch failed: ${imgRes.status}` };
    }
    const imgBuffer = await imgRes.arrayBuffer();
    const base64Data = Buffer.from(imgBuffer).toString("base64");
    const contentType = imgRes.headers.get("content-type") || "image/png";

    // Step 2: Upload to Twitter media upload API (simple upload for images < 5MB)
    const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
    const uploadParams: Record<string, string> = {
      media_data: base64Data,
      media_category: "tweet_image",
    };

    // For media upload, we need to use form-urlencoded with OAuth
    const uploadAuth = generateOAuthHeader(
      "POST", uploadUrl, {}, apiKey, apiSecret, accessToken, accessSecret
    );

    const uploadBody = new URLSearchParams(uploadParams);
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: uploadAuth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: uploadBody.toString(),
    });

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text();
      return { platform: "twitter-image", status: "error", message: `Media upload failed: ${uploadErr.slice(0, 150)}` };
    }

    const uploadData = await uploadRes.json();
    const mediaId = uploadData.media_id_string;

    if (!mediaId) {
      return { platform: "twitter-image", status: "error", message: "No media_id returned" };
    }

    // Step 3: Post the tweet with the media attached
    const tweetUrl = "https://api.twitter.com/2/tweets";
    const tweetBody = JSON.stringify({
      text: text.length > 280 ? text.slice(0, 277) + "..." : text,
      media: { media_ids: [mediaId] },
    });

    const tweetAuth = generateOAuthHeader(
      "POST", tweetUrl, {}, apiKey, apiSecret, accessToken, accessSecret
    );

    const tweetRes = await fetch(tweetUrl, {
      method: "POST",
      headers: {
        Authorization: tweetAuth,
        "Content-Type": "application/json",
      },
      body: tweetBody,
    });

    if (tweetRes.ok) return { platform: "twitter-image", status: "success" };
    const tweetErr = await tweetRes.text();
    return { platform: "twitter-image", status: "error", message: tweetErr.slice(0, 200) };
  } catch (err) {
    return { platform: "twitter-image", status: "error", message: String(err).slice(0, 200) };
  }
}

// --- Main: Post to All ---
export async function postToAll(post: PostData): Promise<SocialResult[]> {
  // If coverImage is missing or a relative path that won't resolve on social platforms,
  // try to find a matching library image with an absolute URL
  try {
    if (!post.coverImage || (post.coverImage.startsWith("/") && !post.coverImage.startsWith("https"))) {
      const { findMatchingImages } = await import("./image-library");
      const keywords = (post.tags || []).filter(Boolean);
      if (keywords.length > 0) {
        const matches = await findMatchingImages(keywords, { limit: 1 });
        if (matches.length > 0 && matches[0].url.startsWith("http")) {
          post = { ...post, coverImage: matches[0].url };
          console.log(`[social] Using library image as cover: ${matches[0].description}`);
        }
      }
    }
  } catch (err) {
    console.error("[social] Library image fallback error:", err);
  }

  const results = await Promise.allSettled([
    postToTwitter(post),
    postToFacebook(post),
    postToInstagram(post),
    postToLinkedIn(post),
    postToReddit(post),
    postToTelegram(post),
    postToPinterest(post),
    postToDiscord(post),
  ]);

  const socialResults: SocialResult[] = results.flatMap((r) =>
    r.status === "fulfilled"
      ? (Array.isArray(r.value) ? r.value : [r.value])
      : [{ platform: "unknown", status: "error" as const, message: String(r.reason) }]
  );

  // Console log for debugging
  for (const r of socialResults) {
    if (r.status === "success") console.log(`[social] ✓ ${r.platform}: posted`);
    else if (r.status === "skipped") console.log(`[social] - ${r.platform}: skipped (${r.message})`);
    else console.error(`[social] ✗ ${r.platform}: ${r.message}`);
  }

  // Log results to GitHub (best-effort)
  try {
    let log: Record<string, unknown>[] = [];
    try {
      const raw = await readFile("data/social-log.json");
      log = JSON.parse(raw);
    } catch { /* file doesn't exist yet */ }

    log.push({
      date: new Date().toISOString(),
      slug: post.slug,
      title: post.title,
      results: socialResults,
    });

    // Keep only last 50 entries
    if (log.length > 50) log = log.slice(-50);

    await commitFile(
      "data/social-log.json",
      JSON.stringify(log, null, 2),
      `Social post log: ${post.title.slice(0, 40)}`
    );
  } catch { /* logging is best-effort */ }

  return socialResults;
}
