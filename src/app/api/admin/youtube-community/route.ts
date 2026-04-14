import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getAllPosts } from "@/lib/blog";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CommunityPost {
  type: "poll" | "tip" | "question" | "behind-the-scenes" | "content-teaser";
  text: string;
  options?: string[];
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Gather recent blog topics for context
    const posts = getAllPosts();
    const recentTopics = posts
      .slice(0, 10)
      .map((p) => p.title)
      .join(", ");

    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `You are the social media manager for R2F Trading, an ICT trading coaching business run by Harvest. The brand teaches smart money concepts, ICT methodology, and helps traders get funded through FTMO.

Generate exactly 5 YouTube Community tab post suggestions. Each post should be engaging and drive interaction (likes, comments, votes).

Recent blog topics for context: ${recentTopics}

Post types to include (one of each):
1. POLL — A trading-related poll with 4 options that sparks debate
2. TIP — A quick actionable trading tip (2-3 sentences max)
3. QUESTION — An engaging question that gets traders commenting
4. BEHIND-THE-SCENES — A personal update about the coaching business or trading journey
5. CONTENT-TEASER — Tease upcoming content or reference a recent video/blog

Guidelines:
- Keep each post under 300 characters (YouTube community post limit is short)
- Use emojis sparingly but effectively
- Include a CTA where natural (comment, like, check link in bio)
- Reference ICT concepts: liquidity, order blocks, fair value gaps, smart money, market structure
- Tone: confident, educational, relatable — not salesy

Return ONLY a valid JSON array with this exact structure, no other text:
[
  { "type": "poll", "text": "post text here", "options": ["Option A", "Option B", "Option C", "Option D"] },
  { "type": "tip", "text": "post text here" },
  { "type": "question", "text": "post text here" },
  { "type": "behind-the-scenes", "text": "post text here" },
  { "type": "content-teaser", "text": "post text here" }
]`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const suggestions: CommunityPost[] = JSON.parse(match[0]);
      return NextResponse.json({ suggestions });
    }

    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
