import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { generateOAuthHeader } from "@/lib/social-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

// -----------------------------------------------------------------------
// IMPORTANT: Twitter API Free tier does NOT include the tweet search
// endpoint (GET /2/tweets/search/recent). That requires Basic ($200/mo)
// or higher. This route uses a FALLBACK approach:
//   1. Try the search endpoint first (works if you have Basic+ tier)
//   2. If search returns 403, fall back to fetching the authenticated
//      user's home timeline mentions or skip search entirely and use
//      a curated list of known trading accounts to reply to.
//
// If you upgrade to Basic tier, the search path works automatically.
// -----------------------------------------------------------------------

const SEARCH_QUERIES = [
  "ICT trading",
  "order blocks setup",
  "fair value gap",
  "FTMO challenge",
  "funded trader",
  "smart money concepts",
  "prop firm tips",
  "liquidity sweep trading",
  "breaker block forex",
  "ICT mentorship",
];

// Known active ICT/prop firm trading accounts to monitor as fallback
const FALLBACK_ACCOUNTS = [
  "ICT_MHunter",
  "traborafx",
  "FTMOcom",
  "TheFundedTrader",
  "MyForexFunds",
];

interface TweetData {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
}

interface EngageLogEntry {
  tweetId: string;
  tweetText: string;
  reply: string;
  authorId: string;
  query: string;
  date: string;
}

function getTwitterAuth() {
  return {
    apiKey: process.env.TWITTER_API_KEY!,
    apiSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  };
}

/** Make an authenticated Twitter API v2 request */
async function twitterGet(url: string, params: Record<string, string>) {
  const { apiKey, apiSecret, accessToken, accessSecret } = getTwitterAuth();
  const auth = generateOAuthHeader("GET", url, params, apiKey, apiSecret, accessToken, accessSecret);
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${url}?${qs}`, {
    headers: { Authorization: auth },
  });
  return res;
}

/** Search recent tweets — requires Basic tier ($200/mo) or higher */
async function searchTweets(query: string): Promise<{ tweets: TweetData[]; searchAvailable: boolean }> {
  const url = "https://api.twitter.com/2/tweets/search/recent";
  const params: Record<string, string> = {
    query: `${query} -is:retweet lang:en`,
    max_results: "10",
    "tweet.fields": "created_at,public_metrics,author_id",
  };

  const res = await twitterGet(url, params);

  if (res.status === 403 || res.status === 401) {
    // Free tier — search not available
    return { tweets: [], searchAvailable: false };
  }

  if (!res.ok) {
    return { tweets: [], searchAvailable: true };
  }

  const data = await res.json();
  return { tweets: data.data || [], searchAvailable: true };
}

/** Fallback: get recent tweets from known trading accounts */
async function getFallbackTweets(): Promise<TweetData[]> {
  const allTweets: TweetData[] = [];

  for (const username of FALLBACK_ACCOUNTS.slice(0, 3)) {
    try {
      // Look up user ID
      const lookupUrl = "https://api.twitter.com/2/users/by/username/" + username;
      const lookupRes = await twitterGet(lookupUrl, {});
      if (!lookupRes.ok) continue;
      const userData = await lookupRes.json();
      const userId = userData.data?.id;
      if (!userId) continue;

      // Get their recent tweets
      const tweetsUrl = `https://api.twitter.com/2/users/${userId}/tweets`;
      const tweetsRes = await twitterGet(tweetsUrl, {
        max_results: "5",
        "tweet.fields": "created_at,public_metrics,author_id",
        exclude: "retweets,replies",
      });
      if (!tweetsRes.ok) continue;
      const tweetsData = await tweetsRes.json();
      if (tweetsData.data) {
        allTweets.push(...tweetsData.data);
      }
    } catch {
      // Skip this account on error
    }
  }

  return allTweets;
}

/** Get the authenticated user's own Twitter user ID */
async function getOwnUserId(): Promise<string | null> {
  const url = "https://api.twitter.com/2/users/me";
  const res = await twitterGet(url, {});
  if (!res.ok) return null;
  const data = await res.json();
  return data.data?.id || null;
}

/** Post a reply to a tweet */
async function postReply(text: string, inReplyToId: string): Promise<boolean> {
  const { apiKey, apiSecret, accessToken, accessSecret } = getTwitterAuth();
  const url = "https://api.twitter.com/2/tweets";
  const auth = generateOAuthHeader("POST", url, {}, apiKey, apiSecret, accessToken, accessSecret);

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      reply: { in_reply_to_tweet_id: inReplyToId },
    }),
  });

  return res.ok;
}

/** Sleep for a random human-like delay */
function humanDelay(): Promise<void> {
  const ms = Math.random() * 30000 + 10000; // 10-40 seconds
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { apiKey, accessToken } = getTwitterAuth();
    if (!apiKey || !accessToken) {
      return NextResponse.json({ error: "Twitter credentials not configured" }, { status: 500 });
    }

    // Load engagement log to avoid duplicate replies
    let engageLog: EngageLogEntry[] = [];
    try {
      const raw = await readFile("data/twitter-engage-log.json");
      engageLog = JSON.parse(raw);
    } catch {
      // File doesn't exist yet — start fresh
    }
    const repliedTweetIds = new Set(engageLog.map((e) => e.tweetId));

    // Get our own user ID to exclude self-tweets
    const ownUserId = await getOwnUserId();

    // Pick 2-3 random search queries for this run
    const shuffled = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);
    const queries = shuffled.slice(0, Math.random() > 0.5 ? 3 : 2);

    // Collect candidate tweets
    let candidates: (TweetData & { query: string })[] = [];
    let usedSearch = false;

    for (const query of queries) {
      const { tweets, searchAvailable } = await searchTweets(query);

      if (!searchAvailable && candidates.length === 0) {
        // Free tier — use fallback approach
        console.log("Twitter search not available (Free tier). Using fallback account monitoring.");
        const fallbackTweets = await getFallbackTweets();
        candidates = fallbackTweets.map((t) => ({ ...t, query: "fallback-accounts" }));
        break;
      }

      usedSearch = searchAvailable;
      candidates.push(...tweets.map((t) => ({ ...t, query })));
    }

    // Filter candidates
    const filtered = candidates.filter((t) => {
      // Skip already-replied tweets
      if (repliedTweetIds.has(t.id)) return false;
      // Skip own tweets
      if (ownUserId && t.author_id === ownUserId) return false;
      // Skip low-engagement tweets (want >2 likes to show the tweet has traction)
      if (t.public_metrics && t.public_metrics.like_count < 2) return false;
      // Skip retweets that slipped through
      if (t.text.startsWith("RT @")) return false;
      return true;
    });

    if (filtered.length === 0) {
      return NextResponse.json({ success: true, replies: 0, message: "No suitable tweets found" });
    }

    // Sort by engagement (likes + retweets) and pick top 2-3
    filtered.sort((a, b) => {
      const scoreA = (a.public_metrics?.like_count || 0) + (a.public_metrics?.retweet_count || 0) * 2;
      const scoreB = (b.public_metrics?.like_count || 0) + (b.public_metrics?.retweet_count || 0) * 2;
      return scoreB - scoreA;
    });

    // Doubled 5 → 10 on 2026-04-24 per Harvest. Well under Twitter's
    // daily tweet ceiling and still modest for organic engagement.
    const replyCount = 10;
    const toReply = filtered.slice(0, replyCount);

    // Generate and post replies
    const anthropic = new Anthropic();
    const results: { tweetId: string; reply: string; status: string }[] = [];
    const shouldMentionR2F = Math.random() < 0.25; // ~1 in 4 chance per run
    const mentionIndex = shouldMentionR2F ? Math.floor(Math.random() * toReply.length) : -1;

    for (let i = 0; i < toReply.length; i++) {
      const tweet = toReply[i];

      // Determine reply style variation
      const sentenceCount = Math.floor(Math.random() * 4) + 1; // 1-4 sentences
      const includeR2FMention = i === mentionIndex;

      const r2fInstruction = includeR2FMention
        ? `Subtly mention R2F Trading in ONE of these ways (pick randomly):
           - "wrote about this on r2ftrading.com"
           - mention "@Road2Funded"
           - "we cover this at R2F"
           Do NOT make it the focus of the reply. The value comes first.`
        : "Do NOT mention R2F Trading, Road2Funded, r2ftrading.com, or any brand. Pure value only.";

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `You are a knowledgeable ICT trader replying to a tweet. Generate a helpful reply.

TWEET TO REPLY TO:
"${tweet.text}"

RULES:
- Keep under 275 characters total
- Write ${sentenceCount} sentence${sentenceCount > 1 ? "s" : ""}
- Sound like a real trader, NOT a bot or marketer
- Add genuine value — a tip, insight, agreement with nuance, or respectful counter-point
- Use casual Twitter tone: short punchy sentences, maybe 1 emoji max
- ${r2fInstruction}
- NEVER use generic phrases like "great point" "so true" "couldn't agree more" as openers
- NEVER use hashtags in replies (looks bot-like)
- NEVER sound like a template or auto-reply
- Vary your sentence structure — don't start every sentence the same way

Return ONLY the reply text. Nothing else.`,
          },
        ],
      });

      let reply = response.content[0].type === "text" ? response.content[0].text : "";
      reply = reply.replace(/^["']|["']$/g, "").trim();

      // Ensure under 275 chars
      if (reply.length > 275) {
        reply = reply.slice(0, 272) + "...";
      }

      // Human-like delay between replies
      if (i > 0) {
        await humanDelay();
      }

      // Post the reply
      const success = await postReply(reply, tweet.id);
      results.push({ tweetId: tweet.id, reply, status: success ? "posted" : "failed" });

      // Log regardless of success
      engageLog.push({
        tweetId: tweet.id,
        tweetText: tweet.text.slice(0, 140),
        reply,
        authorId: tweet.author_id,
        query: tweet.query,
        date: new Date().toISOString(),
      });
    }

    // Trim log to last 500 entries
    if (engageLog.length > 500) {
      engageLog = engageLog.slice(-500);
    }

    // Save engage log
    await commitFile(
      "data/twitter-engage-log.json",
      JSON.stringify(engageLog, null, 2),
      `Twitter engage: ${results.filter((r) => r.status === "posted").length} replies`
    ).catch(() => {});

    const posted = results.filter((r) => r.status === "posted").length;
    return NextResponse.json({
      success: true,
      replies: posted,
      total: results.length,
      searchMethod: usedSearch ? "search-api" : "fallback-accounts",
      results,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
