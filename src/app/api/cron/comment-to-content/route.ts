import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { getRedditAccessToken, getRedditUserAgent } from "@/lib/reddit-auth";
import { sendTelegramReport } from "@/lib/telegram-report";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

const LOG_PATH = "data/reddit-engage-log.json";
const IDEAS_PATH = "data/content-ideas-from-comments.json";
const MIN_SCORE = 5;
const MIN_AGE_DAYS = 3;

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

interface ContentIdea {
  id: string;
  source: "reddit";
  postTitle: string;
  ourComment: string;
  score: number;
  suggestedTopic: string;
  suggestedAngle: string;
  date: string;
  subreddit: string;
  permalink?: string;
  generated?: boolean;
}

// --- Extract comment ID from permalink or stored commentId ---
function getCommentId(entry: EngageLogEntry): string | null {
  if (entry.commentId) return entry.commentId;
  // Extract from permalink like /r/Daytrading/comments/1sgdkoe/.../of6j7in/
  if (entry.permalink) {
    const parts = entry.permalink.split("/").filter(Boolean);
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.length > 3) return lastPart;
  }
  return null;
}

// --- Load existing content ideas ---
async function loadIdeas(): Promise<ContentIdea[]> {
  try {
    const raw = await readFile(IDEAS_PATH);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// --- Save content ideas ---
async function saveIdeas(ideas: ContentIdea[]): Promise<void> {
  await commitFile(
    IDEAS_PATH,
    JSON.stringify(ideas, null, 2),
    "Comment-to-content: update ideas"
  );
}

// --- Fetch comment score from Reddit ---
async function getCommentScore(
  commentId: string,
  accessToken: string
): Promise<number | null> {
  const ua = getRedditUserAgent();
  const res = await fetch(
    `https://oauth.reddit.com/api/info?id=t1_${commentId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": ua,
      },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const comment = data?.data?.children?.[0]?.data;
  return comment?.score ?? null;
}

// --- Get existing blog titles ---
async function getExistingBlogTitles(): Promise<string[]> {
  try {
    const { listFiles } = await import("@/lib/github");
    const files = await listFiles("content/blog", ".mdx");
    return files.map((f) =>
      f
        .replace(/^content\/blog\//, "")
        .replace(/\.mdx$/, "")
        .replace(/^\d{4}-\d{2}-\d{2}-/, "")
        .replace(/-/g, " ")
        .toLowerCase()
    );
  } catch {
    return [];
  }
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

    // Load engagement log
    const logRaw = await readFile(LOG_PATH);
    const log: EngageLogEntry[] = JSON.parse(logRaw);

    // Filter comments older than MIN_AGE_DAYS
    const now = Date.now();
    const candidates = log.filter((entry) => {
      const age = now - new Date(entry.commentedAt).getTime();
      return age > MIN_AGE_DAYS * 24 * 60 * 60 * 1000;
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No comments old enough to check",
      });
    }

    // Load existing ideas to avoid duplicates
    const existingIdeas = await loadIdeas();
    const alreadyProcessed = new Set(
      existingIdeas.map((i) => i.permalink || i.postTitle)
    );

    // Get existing blog titles for topic matching
    const existingTitles = await getExistingBlogTitles();

    const highPerformers: {
      entry: EngageLogEntry;
      score: number;
    }[] = [];

    // Check each candidate's score
    for (const entry of candidates) {
      const commentId = getCommentId(entry);
      if (!commentId) continue;

      // Skip if already processed
      const key = entry.permalink || entry.postTitle;
      if (alreadyProcessed.has(key)) continue;

      const score = await getCommentScore(commentId, accessToken);
      if (score !== null && score >= MIN_SCORE) {
        highPerformers.push({ entry, score });
      }

      // Rate limit
      await new Promise((r) => setTimeout(r, 500));
    }

    if (highPerformers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No high-performing comments found",
        checked: candidates.length,
      });
    }

    // Generate topic ideas for high performers
    const anthropic = new Anthropic();
    const newIdeas: ContentIdea[] = [];

    for (const { entry, score } of highPerformers) {
      // Check if a blog post already covers this topic
      const titleWords = entry.postTitle.toLowerCase().split(/\s+/);
      const alreadyCovered = existingTitles.some((title) => {
        const matchCount = titleWords.filter(
          (w) => w.length > 3 && title.includes(w)
        ).length;
        return matchCount >= 3;
      });

      if (alreadyCovered) continue;

      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          messages: [
            {
              role: "user",
              content: `You are a content strategist for R2F Trading, an ICT trading coaching brand.

A Reddit comment we posted got ${score} upvotes, indicating strong audience interest.

ORIGINAL POST TITLE: ${entry.postTitle}
OUR COMMENT: ${entry.commentText.slice(0, 500)}
SUBREDDIT: r/${entry.subreddit}

Based on the engagement, suggest a blog topic that expands on what made our comment resonate. The blog should provide deeper value on this subject.

Return ONLY a JSON object:
{ "topic": "Blog title under 60 chars", "angle": "1-2 sentence description of the content angle" }`,
            },
          ],
        });

        let text =
          response.content[0].type === "text"
            ? response.content[0].text.trim()
            : "";
        text = text
          .replace(/^```(?:json)?\s*\n?/, "")
          .replace(/\n?```\s*$/, "")
          .trim();
        const topicData = JSON.parse(text);

        const idea: ContentIdea = {
          id: `reddit-${entry.postId}-${Date.now()}`,
          source: "reddit",
          postTitle: entry.postTitle,
          ourComment: entry.commentText,
          score,
          suggestedTopic: topicData.topic,
          suggestedAngle: topicData.angle,
          date: new Date().toISOString(),
          subreddit: entry.subreddit,
          permalink: entry.permalink,
        };

        newIdeas.push(idea);

        // Send Telegram notification
        await sendTelegramReport(
          `💡 *High-performing comment found!*\n\nSubreddit: r/${entry.subreddit}\nScore: ${score} upvotes\nPost: ${entry.postTitle.slice(0, 60)}\n\nTopic idea: ${topicData.topic}\nAngle: ${topicData.angle}`
        );
      } catch (err) {
        console.error(
          "[comment-to-content] Failed to generate topic for:",
          entry.postId,
          err
        );
      }
    }

    if (newIdeas.length > 0) {
      const allIdeas = [...existingIdeas, ...newIdeas];
      await saveIdeas(allIdeas);
    }

    return NextResponse.json({
      success: true,
      checked: candidates.length,
      highPerformers: highPerformers.length,
      newIdeas: newIdeas.length,
      ideas: newIdeas.map((i) => ({
        topic: i.suggestedTopic,
        score: i.score,
        subreddit: i.subreddit,
      })),
    });
  } catch (err: unknown) {
    console.error("[comment-to-content] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
