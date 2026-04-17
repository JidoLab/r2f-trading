import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const SEO_PAGES = [
  { topic: "R2F Trading vs FTMO Coaching — Is personal mentorship better than going solo with a prop firm?", keyword: "ict trading coaching vs ftmo" },
  { topic: "Best ICT Trading Coaching Programs in 2026 — A comparison of top ICT mentors and what to look for", keyword: "best ict trading coaching programs 2026" },
  { topic: "ICT Trading Coach vs Self-Learning — Which path gets you funded faster?", keyword: "ict trading coach vs self learning" },
  { topic: "Top Prop Firm Coaching Programs Compared — Which coaching actually helps you pass?", keyword: "prop firm coaching programs compared" },
  { topic: "R2F Trading Review — What real students say about this ICT coaching", keyword: "r2f trading review" },
  { topic: "How to Pass the FTMO Challenge — Complete guide with ICT strategy breakdown", keyword: "how to pass ftmo challenge ict" },
  { topic: "ICT Order Blocks Explained — The complete trading guide for beginners", keyword: "ict order blocks explained guide" },
  { topic: "Smart Money Concepts vs Retail Trading Strategies — Why institutions trade differently", keyword: "smart money concepts vs retail trading" },
  { topic: "Best Funded Trader Programs for Beginners in 2026 — Which prop firms are actually beginner-friendly?", keyword: "best funded trader programs beginners 2026" },
  { topic: "ICT Trading Mentorship — What to expect, how to choose, and is it worth the investment?", keyword: "ict trading mentorship worth it" },
];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anthropic = new Anthropic();
  const results: { slug: string; status: string }[] = [];

  for (const page of SEO_PAGES) {
    const slug = slugify(page.keyword);

    // Skip if already exists
    try {
      await readFile(`data/landing-pages/${slug}.json`);
      results.push({ slug, status: "exists" });
      continue;
    } catch {
      // Doesn't exist, generate it
    }

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `You are a content strategist for R2F Trading (r2ftrading.com), an ICT trading coaching business — a dedicated ICT coaching brand.

Generate a landing page for the topic: "${page.topic}"
Target keyword: "${page.keyword}"

Return ONLY a JSON object with these fields:
{
  "title": "Short page title (under 40 chars)",
  "seoTitle": "SEO-optimized title (under 70 chars) including the target keyword",
  "seoDescription": "Meta description (under 160 chars) with target keyword, compelling and action-oriented",
  "headline": "Attention-grabbing headline that addresses a pain point (under 80 chars)",
  "subheadline": "Supporting text that expands on the headline benefit (1-2 sentences)",
  "keyPoints": [
    { "icon": "emoji", "title": "Point title (under 40 chars)", "text": "2-3 sentence explanation" }
  ],
  "relatedTags": ["tag1", "tag2", "tag3"]
}

Requirements:
- 5 key points covering: what it is, why it matters, how to use it, common mistakes, and next steps
- relatedTags should match likely blog post tags (lowercase, hyphenated)
- Headline should be benefit-driven, not feature-driven
- All copy should speak to forex/futures traders learning ICT methodology
- Include the target keyword naturally in the seoTitle, seoDescription, and headline
- Icons should be relevant emojis (not generic)`,
        }],
      });

      let text = response.content[0].type === "text" ? response.content[0].text : "";
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
      const generated = JSON.parse(text);

      const pageData = {
        slug,
        title: generated.title,
        seoTitle: generated.seoTitle,
        seoDescription: generated.seoDescription,
        headline: generated.headline,
        subheadline: generated.subheadline,
        keyPoints: generated.keyPoints,
        relatedTags: generated.relatedTags,
        testimonialIndex: Math.floor(Math.random() * 4),
        createdAt: new Date().toISOString(),
        targetKeyword: page.keyword,
      };

      await commitFile(
        `data/landing-pages/${slug}.json`,
        JSON.stringify(pageData, null, 2),
        `SEO page: ${generated.title}`
      );

      results.push({ slug, status: "created" });

      // Small delay between generations
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      results.push({ slug, status: `error: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  // Notify IndexNow for all new pages
  const newSlugs = results.filter(r => r.status === "created").map(r => `/learn/${r.slug}`);
  if (newSlugs.length > 0) {
    try {
      const { notifyIndexNow } = await import("@/lib/indexnow");
      await notifyIndexNow([...newSlugs, "/sitemap.xml"]);
    } catch {}
  }

  const created = results.filter(r => r.status === "created").length;
  const existed = results.filter(r => r.status === "exists").length;
  const errors = results.filter(r => r.status.startsWith("error")).length;

  return NextResponse.json({
    success: true,
    created,
    existed,
    errors,
    results,
  });
}
