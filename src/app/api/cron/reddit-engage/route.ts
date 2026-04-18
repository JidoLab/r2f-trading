import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { getRedditAccessToken, getRedditUserAgent } from "@/lib/reddit-auth";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentDateContext } from "@/lib/date-context";

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
  commentId?: string;
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

      // Prioritize unanswered questions (first responder advantage)
      if (a.num_comments === 0) scoreA += 20;
      else if (a.num_comments < 3) scoreA += 12;
      else if (a.num_comments < 10) scoreA += 5;
      if (b.num_comments === 0) scoreB += 20;
      else if (b.num_comments < 3) scoreB += 12;
      else if (b.num_comments < 10) scoreB += 5;

      // Prefer questions
      if (a.title.includes("?")) scoreA += 15;
      if (b.title.includes("?")) scoreB += 15;

      // Prefer very recent posts (first responder)
      const ageHoursA = (Date.now() / 1000 - a.created_utc) / 3600;
      if (ageHoursA < 2) scoreA += 10;
      else if (ageHoursA < 6) scoreA += 5;
      const ageHoursB = (Date.now() / 1000 - b.created_utc) / 3600;
      if (ageHoursB < 2) scoreB += 10;
      else if (ageHoursB < 6) scoreB += 5;

      // Prefer posts with some upvotes (engaged audience)
      if (a.score >= 3 && a.score <= 50) scoreA += 3;
      if (b.score >= 3 && b.score <= 50) scoreB += 3;

      // Prefer posts with body text (more context to reply to)
      if (a.selftext.length > 50) scoreA += 5;
      if (b.selftext.length > 50) scoreB += 5;

      return scoreB - scoreA;
    });
}

// --- Generate a helpful comment using Claude ---
async function generateComment(
  post: RedditPost,
  shouldMentionR2F: boolean
): Promise<string> {
  const anthropic = new Anthropic();

  // Randomly select a comment style for variety
  const styles = [
    "direct_answer", // straight to the point answer
    "personal_story", // "i had this exact problem when..."
    "challenge_premise", // respectfully disagree or add nuance
    "specific_technique", // share one concrete thing to try
    "question_back", // answer + ask a follow-up question
  ];
  const style = styles[Math.floor(Math.random() * styles.length)];

  const styleInstructions: Record<string, string> = {
    direct_answer: "Get straight to the answer. No preamble. First sentence IS the solution or insight.",
    personal_story: "Start with 'i had this exact problem...' or 'this happened to me last month...' and share a specific experience. Include a real detail (pair, timeframe, what you saw on the chart).",
    challenge_premise: "Respectfully add nuance or a different perspective. 'this is true but there's a catch most people miss...' or 'works great except when...'",
    specific_technique: "Share ONE specific thing to try. Be concrete: 'try marking the last down candle before the displacement on the 15m. if price comes back to it during NY killzone, that's your entry.'",
    question_back: "Answer their question, then ask a follow-up that shows expertise: 'are you looking at this on the 15m or 1h? makes a huge difference for OB validity.'",
  };

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are an experienced R2F Trading ICT coach browsing r/${post.subreddit}. Write a Reddit comment.

${getCurrentDateContext()}


POST TITLE: ${post.title}
POST BODY: ${post.selftext.slice(0, 1500) || "(no body text)"}

COMMENT STYLE: ${style} — ${styleInstructions[style]}

QUALITY RULES:
- 2-4 sentences max. Concise. No filler.
- Sound like a REAL person on Reddit, not a polished brand. Use contractions, lowercase, casual grammar.
- Include at least ONE specific ICT detail (pair name, timeframe, concept name like "FVG", "OB", "BOS", session name)
- Reference something SPECIFIC from the post title or body. Don't give generic advice.
- NEVER use dashes, hashtags, bullet points, or numbered lists.
- NEVER start with "Great question!", "Solid post", or generic praise.
- NEVER sound like an AI or a marketing bot.
- Zero or one emoji max.
- Vary sentence lengths. Mix short (3-5 words) with medium (8-15 words).
- Occasionally use Reddit-isms naturally: "imo", "tbh", "this is the way", "been there"
- NEVER mention "students", "my students", "coaching", "my coaching", "mentees", R2F Trading, r2ftrading.com, any website, or anything promotional. Pure value only.
- NEVER ask anyone to DM you, message you, PM you, reach out, or contact you. No "happy to chat", "feel free to DM", "shoot me a message", "my inbox is open", etc.
- If your comment makes a claim that could need clarification, you may add a single sentence like "happy to clarify anything in the thread" — but ONLY in the thread, never soliciting private contact.

WHAT A BAD COMMENT LOOKS LIKE (avoid this):
"Great question! ICT concepts like order blocks and fair value gaps can really help with this. Make sure you're using proper risk management and backtesting your strategy."
^ This is generic, uses a dash, starts with praise, and adds no specific value.

WHAT A GOOD COMMENT LOOKS LIKE:
"the issue with trading OBs during london is that most of them form in premium. try filtering for only discount OBs below the 50% fib of the daily range. i stopped taking premium entries last year and my win rate went from 38% to 52%."
^ This is specific, uses real numbers, references a concrete technique, and sounds human.

Return ONLY the comment text.`,
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
): Promise<{ success: boolean; permalink?: string; commentId?: string; error?: string }> {
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

  const commentData = data?.json?.data?.things?.[0]?.data;
  const permalink = commentData?.permalink || undefined;
  const commentId = commentData?.id || undefined;
  return { success: true, permalink, commentId };
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
        const { success, permalink, commentId, error } = await postComment(
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
            commentId,
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
