import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile } from "@/lib/github";
import { getAllPosts } from "@/lib/blog";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_PATH = "data/content-gaps.json";
const CACHE_TTL = 3 * 86400000; // 3 days

interface ContentGap {
  topic: string;
  keyword: string;
  searchIntent: "informational" | "commercial" | "navigational";
  difficulty: "easy" | "medium" | "hard";
  reason: string;
  suggestedTitle: string;
}

interface GapsData {
  gaps: ContentGap[];
  generatedAt: string;
  existingTopics: string[];
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check cache
  try {
    const cached = JSON.parse(await readFile(CACHE_PATH));
    if (cached.generatedAt && Date.now() - new Date(cached.generatedAt).getTime() < CACHE_TTL) {
      return NextResponse.json(cached);
    }
  } catch {}

  // Get existing blog topics
  const posts = getAllPosts();
  const existingTopics = posts.map(p => p.title);
  const existingTags = [...new Set(posts.flatMap(p => p.tags))];

  // Get competitor data if available
  let competitorData = "";
  try {
    const raw = await readFile("data/competitor-data.json");
    const competitors = JSON.parse(raw);
    if (Array.isArray(competitors)) {
      const titles = competitors.flatMap((c: { recentVideos?: { title: string }[] }) =>
        (c.recentVideos || []).map(v => v.title)
      );
      competitorData = `\nCOMPETITOR CONTENT (from YouTube channels):\n${titles.slice(0, 30).map(t => `- ${t}`).join("\n")}`;
    }
  } catch {}

  // Get landing page topics
  let landingPageTopics: string[] = [];
  try {
    const { listFiles } = await import("@/lib/github");
    const files = await listFiles("data/landing-pages", ".json");
    for (const f of files) {
      try {
        const raw = await readFile(f);
        const data = JSON.parse(raw);
        if (data.targetKeyword) landingPageTopics.push(data.targetKeyword);
      } catch {}
    }
  } catch {}

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are an SEO content strategist for R2F Trading, an ICT trading coaching business.

EXISTING BLOG POSTS (${posts.length} total):
${existingTopics.map(t => `- ${t}`).join("\n")}

EXISTING TAGS: ${existingTags.join(", ")}

EXISTING LANDING PAGES: ${landingPageTopics.join(", ")}
${competitorData}

BUSINESS CONTEXT:
- Solo ICT trading coaching brand (R2F Trading)
- Coaching plans: $150-$1000/week
- $49 starter kit digital product
- Target: forex/futures traders learning ICT methodology
- Goal: rank for high-intent trading coaching keywords

Analyze the existing content and identify exactly 10 content gaps — topics that are MISSING and would drive organic search traffic. Focus on:

1. High-intent keywords traders search before buying coaching (commercial intent)
2. Beginner questions that drive volume ("what is...", "how to...")
3. Comparison/alternative queries ("X vs Y", "best X for Y")
4. Problem-solving queries ("why does my X keep failing")
5. Topics competitors cover that we don't

For each gap, provide:
- topic: Short topic name
- keyword: Target search keyword (long-tail preferred)
- searchIntent: informational, commercial, or navigational
- difficulty: easy (low competition), medium, or hard
- reason: Why this gap matters (1 sentence)
- suggestedTitle: A blog post title under 60 chars

Return ONLY a JSON array of objects. No other text.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ gaps: [], existingTopics, generatedAt: new Date().toISOString() });

    const gaps: ContentGap[] = JSON.parse(match[0]);

    const data: GapsData = {
      gaps,
      generatedAt: new Date().toISOString(),
      existingTopics,
    };

    await commitFile(CACHE_PATH, JSON.stringify(data, null, 2), "Content gap analysis update").catch(() => {});

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
