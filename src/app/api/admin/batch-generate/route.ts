import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { commitFile, readFile, listFiles } from "@/lib/github";
import { notifyIndexNow } from "@/lib/indexnow";
import { postToAll } from "@/lib/social";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 300;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const DIVERSE_TOPICS = [
  { topic: "5 Signs You're Revenge Trading", category: "Trading Psychology", postType: "listicle", targetKeyword: "revenge trading" },
  { topic: "The 1% Rule That Saved My Career", category: "Risk Management", postType: "personal-story", targetKeyword: "1 percent rule trading" },
  { topic: "ICT Trading for Complete Beginners", category: "Beginner Guide", postType: "how-to", targetKeyword: "ICT trading beginners" },
  { topic: "How I Passed FTMO in 12 Days", category: "Funded Accounts", postType: "case-study", targetKeyword: "pass FTMO challenge" },
  { topic: "ICT Killzones: When Smart Money Moves", category: "ICT Concepts", postType: "how-to", targetKeyword: "ICT killzones" },
  { topic: "Scalping vs Swing Trading with ICT", category: "Market Analysis", postType: "comparison", targetKeyword: "scalping vs swing trading" },
  { topic: "Why Boredom Destroys More Accounts Than Bad Setups", category: "Trading Psychology", postType: "myth-buster", targetKeyword: "overtrading boredom" },
  { topic: "Position Sizing Cheat Sheet for Funded Traders", category: "Risk Management", postType: "checklist", targetKeyword: "position sizing funded account" },
];

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count = 8 } = await req.json().catch(() => ({ count: 8 }));
  const topics = DIVERSE_TOPICS.slice(0, Math.min(count, 8));

  const anthropic = new Anthropic();
  const date = new Date().toISOString().split("T")[0];
  const results: { title: string; slug: string; status: string }[] = [];

  // Get existing post slugs for internal linking
  let existingSlugs: string[] = [];
  try {
    const files = await listFiles("content/blog", ".mdx");
    existingSlugs = files.map(f => f.replace(/^content\/blog\//, "").replace(/\.mdx$/, ""));
  } catch {}

  for (const topicData of topics) {
    try {
      // Generate article with Claude
      const articleResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 5000,
        messages: [{
          role: "user",
          content: `Write a blog article for R2F Trading (r2ftrading.com).
AUTHOR: Harvest Wright — sole mentor, 10+ years ICT trading experience, TradingView Editors' Pick, Top 1% in competitions, FTMO Challenge passer.
TOPIC: "${topicData.topic}" | CATEGORY: ${topicData.category} | POST TYPE: ${topicData.postType} | KEYWORD: "${topicData.targetKeyword}" | DATE: ${date}
COACHING: Lite $150/week, Pro $200/week, Full Mentorship $1,000/4 months.
INTERNAL LINKS (use 2-4 naturally):
- [coaching plans](/coaching)
- [book a free discovery call](/contact)
- [trading insights](/trading-insights)
- [student results](/results)
${existingSlugs.length > 0 ? `- RELATED POSTS:\n${existingSlugs.slice(0, 10).map(s => `  - [${s.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ")}](/trading-insights/${s})`).join("\n")}` : ""}
Write 1200-1800 words, first person as Harvest. Structure to match the POST TYPE format.
TITLE RULES: The "title" MUST be under 60 characters. Short and punchy. "seoTitle" can be up to 70 chars.
SEO: Target keyword in first paragraph, first H2, and 3-5x naturally.
Include 1-2 EXTERNAL LINKS to authoritative sources (TradingView, Investopedia, BabyPips, CME Group).
Return ONLY JSON: { "title": "...", "seoTitle": "...", "excerpt": "...", "seoDescription": "...", "seoKeywords": [...], "tags": [...], "postType": "...", "body": "...", "imagePrompts": ["...", "..."] }`,
        }],
      });

      let text = articleResponse.content[0].type === "text" ? articleResponse.content[0].text : "";
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON in response");
      const article = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      const slug = `${date}-${slugify(article.title)}`;

      // Generate cover image with Gemini
      let coverImage = "";
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiKey });
          const res = await ai.models.generateContent({
            model: "gemini-3.1-flash-image-preview",
            contents: `Blog cover: "${article.title}". Landscape 16:9, trading theme. Style: Dark navy (#0d2137) and gold (#c9a84c). No text.`,
            config: { responseModalities: ["TEXT", "IMAGE"] },
          });
          for (const part of res.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData) {
              await commitFile(`public/blog/${slug}-cover.jpg`, part.inlineData.data!, `Cover: ${slug}`, true);
              coverImage = `/blog/${slug}-cover.jpg`;
              break;
            }
          }
        } catch {}
      }

      // Commit MDX
      const mdxContent = `export const metadata = {
  title: ${JSON.stringify(article.title)},
  seoTitle: ${JSON.stringify(article.seoTitle || article.title)},
  date: "${date}",
  excerpt: ${JSON.stringify(article.excerpt)},
  seoDescription: ${JSON.stringify(article.seoDescription)},
  seoKeywords: ${JSON.stringify(article.seoKeywords || [])},
  coverImage: ${JSON.stringify(coverImage)},
  tags: ${JSON.stringify(article.tags || [])},
  postType: ${JSON.stringify(article.postType || topicData.postType)},
}

${article.body}
`;

      await commitFile(`content/blog/${slug}.mdx`, mdxContent, `Blog: ${article.title.slice(0, 40)}`);

      // Index + social (fire-and-forget)
      notifyIndexNow([`https://www.r2ftrading.com/trading-insights/${slug}`]).catch(() => {});
      postToAll({ title: article.title, excerpt: article.excerpt, slug, coverImage, tags: article.tags || [] }).catch(() => {});

      results.push({ title: article.title, slug, status: "success" });
      existingSlugs.push(slug); // For internal linking in next posts
    } catch (err: unknown) {
      results.push({ title: topicData.topic, slug: "", status: `error: ${err instanceof Error ? err.message : "unknown"}` });
    }
  }

  return NextResponse.json({
    generated: results.filter(r => r.status === "success").length,
    total: topics.length,
    results,
  });
}
