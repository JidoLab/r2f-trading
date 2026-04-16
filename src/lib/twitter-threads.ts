import Anthropic from "@anthropic-ai/sdk";
import { generateOAuthHeader } from "./social-auth";

const TWITTER_API_URL = "https://api.twitter.com/2/tweets";
const SITE_URL = "https://www.r2ftrading.com";

/**
 * Uses Claude to convert a blog post into a 5-7 tweet thread.
 */
export async function generateThread(
  title: string,
  body: string,
  slug: string
): Promise<string[]> {
  const articleUrl = `${SITE_URL}/trading-insights/${slug}`;

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Convert this blog post into a Twitter/X thread of 5-7 tweets.

TITLE: ${title}
ARTICLE URL: ${articleUrl}

BODY:
${body.slice(0, 4000)}

THREAD FORMAT RULES:
- Tweet 1: Attention-grabbing hook that creates curiosity. MUST include "🧵" emoji. Do NOT include the article link in tweet 1.
- Tweets 2-5: One key insight per tweet. Use short punchy sentences. Add relevant emojis sparingly.
- Tweet 6: Summary/takeaway that ties everything together.
- Tweet 7 (LAST tweet, always): CTA exactly like this:
  "Read the full article: ${articleUrl}

Follow @Road2Funded for daily trading insights 📈"

CRITICAL RULES:
- Each tweet MUST be under 275 characters (this is non-negotiable)
- Do NOT use hashtags in the thread (they look spammy in threads)
- Write in first person as a trading coach
- Make each tweet standalone-valuable (people scroll)
- Use line breaks within tweets for readability

Return ONLY a JSON array of strings, one per tweet. Example: ["tweet 1", "tweet 2", ...]`,
      },
    ],
  });

  let text =
    response.content[0].type === "text" ? response.content[0].text : "";
  text = text
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();

  const tweets: string[] = JSON.parse(text);

  // Validate and truncate
  return tweets.map((tweet) =>
    tweet.length > 275 ? tweet.slice(0, 272) + "..." : tweet
  );
}

/**
 * Posts a tweet thread to Twitter/X using OAuth 1.0a.
 * Posts the first tweet, then replies to each previous tweet.
 */
export async function postThread(
  tweets: string[]
): Promise<{ success: boolean; tweetIds: string[] }> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.log("[thread] Skipped: no Twitter credentials");
    return { success: false, tweetIds: [] };
  }

  const tweetIds: string[] = [];

  for (let i = 0; i < tweets.length; i++) {
    const body: { text: string; reply?: { in_reply_to_tweet_id: string } } = {
      text: tweets[i],
    };

    // After the first tweet, each subsequent tweet replies to the previous one
    if (i > 0 && tweetIds.length > 0) {
      body.reply = { in_reply_to_tweet_id: tweetIds[tweetIds.length - 1] };
    }

    const authHeader = generateOAuthHeader(
      "POST",
      TWITTER_API_URL,
      {},
      apiKey,
      apiSecret,
      accessToken,
      accessSecret
    );

    const res = await fetch(TWITTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(
        `[thread] Failed to post tweet ${i + 1}/${tweets.length}: ${err.slice(0, 200)}`
      );
      // Return partial success — we posted some tweets
      return { success: false, tweetIds };
    }

    const data = await res.json();
    const tweetId = data?.data?.id;
    if (tweetId) {
      tweetIds.push(tweetId);
      console.log(`[thread] Posted tweet ${i + 1}/${tweets.length}: ${tweetId}`);
    } else {
      console.error(`[thread] No tweet ID in response for tweet ${i + 1}`);
      return { success: false, tweetIds };
    }
  }

  return { success: true, tweetIds };
}
