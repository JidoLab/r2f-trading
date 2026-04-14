import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { getRedditAccessToken, getRedditUserAgent } from "@/lib/reddit-auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

const SUBREDDITS = ["Forex", "Daytrading", "FundedTrading", "ForexTrading", "proptrading"];

const SEARCH_QUERIES = [
  "ICT trading",
  "order blocks",
  "prop firm",
  "funded account",
  "FTMO",
  "smart money concepts",
  "fair value gap",
  "liquidity sweep",
  "break of structure",
  "funded trader",
];

const LOG_PATH = "data/reddit-engage-log.json";
const MAX_COMMENTS_PER_RUN = 5;
const MAX_LOG_ENTRIES = 200;

interface EngageLogEntry {
  postId: string;
  subreddit: string;
  postTitle: string;
  commentText: string;
  mentionedR2F: boolean;
  commentedAt: string;
  permalink?: string;
}

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  num_comments: number;
  score: number;
  permalink: string;
  created_utc: number;
  author: string;
}

// --- Load engagement log ---
async function loadLog(): Promise<EngageLogEntry[]> {
  try {
    const raw = await readFile(LOG_PATH);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// --- Save engagement log ---
async function saveLog(log: EngageLogEntry[]): Promise<void> {
  const trimmed = log.length > MAX_LOG_ENTRIES ? log.slice(-MAX_LOG_ENTRIES) : log;
  await commitFile(
    LOG_PATH,
    JSON.stringify(trimmed, null, 2),
    `Reddit engage: ${trimmed[trimmed.length - 1]?.subreddit || "update"}`
  );
}

// --- Search subreddit for recent posts ---
async function searchSubreddit(
  subreddit: string,
  query: string,
  accessToken: string
): Promise<RedditPost[]> {
  const ua = getRedditUserAgent();
  const params = new URLSearchParams({
    q: query,
    sort: "new",
    t: "day",
    limit: "5",
    restrict_sr: "true",
  });

  const res = await fetch(
    `https://oauth.reddit.com/r/${subreddit}/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": ua,
      },
    }
  );

  if (!res.ok) {
    console.error(`[reddit-engage] Search failed r/${subreddit} q=${query}: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const posts: RedditPost[] = (data?.data?.children || []).map(
    (c: { data: RedditPost }) => c.data
  );

  return posts;
}

// --- Score posts for engagement priority ---
function scorePosts(posts: RedditPost[], alreadyCommented: Set<string>): RedditPost[] {
  const username = (process.env.REDDIT_USERNAME || "").toLowerCase();

  return posts
    .filter((p) => {
      // Skip if we already commented
      if (alreadyCommented.has(p.id)) return false;
      // Skip our own posts
      if (p.author.toLowerCase() === username) return false;
      // Skip very old posts (>24h)
      if (Date.now() / 1000 - p.created_utc > 86400) return false;
      return true;
    })
    .sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Prefer posts with questions (title ends with ?)
      if (a.title.includes("?")) scoreA += 10;
      if (b.title.includes("?")) scoreB += 10;

      // Prefer posts with fewer comments (more visible)
      if (a.num_comments < 5) scoreA += 8;
      else if (a.num_comments < 15) scoreA += 4;
      if (b.num_comments < 5) scoreB += 8;
      else if (b.num_comments < 15) scoreB += 4;

      // Prefer posts with some upvotes (engaged audience)
      if (a.score >= 3 && a.score <= 50) scoreA += 3;
      if (b.score >= 3 && b.score <= 50) scoreB += 3;

      // Prefer posts with body text (more context to reply to)
      if (a.selftext.length > 50) scoreA += 2;
      if (b.selftext.length > 50) scoreB += 2;

      return scoreB - scoreA;
    });
}

// --- Generate a helpful comment using Claude ---
async function generateComment(
  post: RedditPost,
  shouldMentionR2F: boolean
): Promise<string> {
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are Harvest Wright, an experienced ICT trader. You're browsing r/${post.subreddit} and found this post. Write a helpful Reddit comment.

POST TITLE: ${post.title}
POST BODY: ${post.selftext.slice(0, 1500) || "(no body text)"}

RULES:
- Write 2-4 sentences max. Keep it concise and punchy.
- Sound like a real trader sharing experience on Reddit
- Use casual Reddit tone. Contractions, lowercase, no formal language
- Include specific ICT knowledge where relevant (order blocks, FVGs, liquidity sweeps, BOS, killzones, etc.)
- NEVER use dashes of any kind. No hyphens connecting phrases, no em dashes, no en dashes. Use periods or commas instead.
- NEVER use hashtags
- NEVER start with "Great question!" or any generic opener
- NEVER sound like a marketing bot
- No bullet points or numbered lists
- One emoji max, or zero
${
  shouldMentionR2F
    ? `- Casually reference "my students" or "one of my students" in a natural way. For example: "one of my students had this exact issue, turned out they were entering in premium" or "i see this with my students all the time, the fix is usually..." This should make readers curious enough to check your profile. Do NOT mention R2F Trading, a website, or coaching directly.`
    : `- Do NOT mention students, coaching, R2F Trading, your website, or anything promotional. Pure value only.`
}

Return ONLY the comment text, no JSON, no quotes, no explanation.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";
  return text;
}

// --- Post a comment on Reddit ---
async function postComment(
  postId: string,
  text: string,
  accessToken: string
): Promise<{ success: boolean; permalink?: string; error?: string }> {
  const ua = getRedditUserAgent();

  const res = await fetch("https://oauth.reddit.com/api/comment", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": ua,
    },
    body: new URLSearchParams({
      api_type: "json",
      thing_id: `t3_${postId}`,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: err.slice(0, 200) };
  }

  const data = await res.json();
  const errors = data?.json?.errors;
  if (errors && errors.length > 0) {
    return { success: false, error: JSON.stringify(errors).slice(0, 200) };
  }

  const permalink =
    data?.json?.data?.things?.[0]?.data?.permalink || undefined;
  return { success: true, permalink };
}

// --- Main handler ---
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getRedditAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Failed to get Reddit access token" },
        { status: 500 }
      );
    }

    // Load existing log to avoid duplicate comments
    const log = await loadLog();
    const alreadyCommented = new Set(log.map((e) => e.postId));

    // Pick random search queries and subreddits for this run
    const shuffledQueries = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);
    const shuffledSubs = [...SUBREDDITS].sort(() => Math.random() - 0.5);
    const queriesToUse = shuffledQueries.slice(0, 3);
    const subsToUse = shuffledSubs.slice(0, 3);

    // Search for posts
    const allPosts: RedditPost[] = [];
    const seenIds = new Set<string>();

    for (const sub of subsToUse) {
      for (const query of queriesToUse) {
        const posts = await searchSubreddit(sub, query, accessToken);
        for (const p of posts) {
          if (!seenIds.has(p.id)) {
            seenIds.add(p.id);
            allPosts.push(p);
          }
        }
        // Small delay to respect rate limits
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.log(
      `[reddit-engage] Found ${allPosts.length} unique posts across ${subsToUse.join(", ")}`
    );

    // Score and pick the best posts
    const ranked = scorePosts(allPosts, alreadyCommented);
    const toComment = ranked.slice(0, MAX_COMMENTS_PER_RUN);

    if (toComment.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No suitable posts found to comment on",
        searched: allPosts.length,
      });
    }

    // Decide which comments mention R2F (~1 in 3)
    const r2fIndex = Math.floor(Math.random() * toComment.length);

    const results: {
      postId: string;
      subreddit: string;
      title: string;
      status: string;
      mentionedR2F: boolean;
    }[] = [];

    for (let i = 0; i < toComment.length; i++) {
      const post = toComment[i];
      const shouldMentionR2F = i === r2fIndex;

      try {
        // Generate comment
        const commentText = await generateComment(post, shouldMentionR2F);
        if (!commentText || commentText.length < 20) {
          results.push({
            postId: post.id,
            subreddit: post.subreddit,
            title: post.title.slice(0, 60),
            status: "skipped-empty",
            mentionedR2F: shouldMentionR2F,
          });
          continue;
        }

        // Post comment
        const { success, permalink, error } = await postComment(
          post.id,
          commentText,
          accessToken
        );

        if (success) {
          log.push({
            postId: post.id,
            subreddit: post.subreddit,
            postTitle: post.title,
            commentText,
            mentionedR2F: shouldMentionR2F,
            commentedAt: new Date().toISOString(),
            permalink,
          });

          results.push({
            postId: post.id,
            subreddit: post.subreddit,
            title: post.title.slice(0, 60),
            status: "success",
            mentionedR2F: shouldMentionR2F,
          });
        } else {
          results.push({
            postId: post.id,
            subreddit: post.subreddit,
            title: post.title.slice(0, 60),
            status: `error: ${error}`,
            mentionedR2F: shouldMentionR2F,
          });
        }

        // Delay between comments to avoid looking bot-like
        if (i < toComment.length - 1) {
          await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
        }
      } catch (err) {
        results.push({
          postId: post.id,
          subreddit: post.subreddit,
          title: post.title.slice(0, 60),
          status: `error: ${err instanceof Error ? err.message : String(err)}`,
          mentionedR2F: shouldMentionR2F,
        });
      }
    }

    // Save updated log
    try {
      await saveLog(log);
    } catch (err) {
      console.error("[reddit-engage] Failed to save log:", err);
    }

    const succeeded = results.filter((r) => r.status === "success").length;
    return NextResponse.json({
      success: true,
      searched: allPosts.length,
      commented: succeeded,
      results,
    });
  } catch (err: unknown) {
    console.error("[reddit-engage] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
