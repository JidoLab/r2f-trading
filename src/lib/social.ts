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

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/feed`,
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
    `https://graph.facebook.com/v19.0/${accountId}/media`,
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
    `https://graph.facebook.com/v19.0/${accountId}/media_publish`,
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

// --- Main: Post to All ---
export async function postToAll(post: PostData): Promise<SocialResult[]> {
  const results = await Promise.allSettled([
    postToTwitter(post),
    postToFacebook(post),
    postToInstagram(post),
    postToLinkedIn(post),
  ]);

  const socialResults: SocialResult[] = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { platform: "unknown", status: "error" as const, message: String(r.reason) }
  );

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
