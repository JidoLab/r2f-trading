import { NextRequest, NextResponse } from "next/server";
import { commitFile, readFile, listFiles } from "@/lib/github";
import { notifyIndexNow } from "@/lib/indexnow";
import { postToAll, postLinkedInArticle } from "@/lib/social";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 300;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const GAP_TOPICS = [
  { topic: "How much does ICT trading coaching cost and is it worth the investment?", category: "Commercial", postType: "faq", targetKeyword: "how much does ICT trading coaching cost" },
  { topic: "Should you learn ICT trading alone or hire a coach? An honest comparison.", category: "Commercial", postType: "comparison", targetKeyword: "should I learn ICT trading alone or hire a coach" },
  { topic: "How long does it realistically take to learn ICT trading from scratch?", category: "Beginner Guide", postType: "how-to", targetKeyword: "how long does it take to learn ICT trading" },
];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anthropic = new Anthropic();
  const date = new Date().toISOString().split("T")[0];
  const results: { topic: string; status: string; slug?: string }[] = [];

  // Get existing post slugs
  let existingTitles: string[] = [];
  try {
    const files = await listFiles("content/blog", ".mdx");
    existingTitles = files.map(f => f.replace(/^content\/blog\//, "").replace(/\.mdx$/, ""));
  } catch {}

  for (const topicData of GAP_TOPICS) {
    try {
      // Generate article
      const articleResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 5000,
        messages: [{
          role: "user",
          content: `Write a blog article for R2F Trading (r2ftrading.com).
AUTHOR: R2F Trading — ICT coaching brand with 10+ years of trading experience, TradingView Editors' Pick recognition, Top 1% competition rankings.
TOPIC: "${topicData.topic}" | CATEGORY: ${topicData.category} | POST TYPE: ${topicData.postType} | KEYWORD: "${topicData.targetKeyword}" | DATE: ${date}
COACHING: Lite $150/week, Pro $200/week, Full Mentorship $1,000/4 months.
INTERNAL LINKS (use 2-4 of these naturally within the article body):
- [coaching plans](/coaching) — link when mentioning mentorship/coaching
- [book a free discovery call](/contact) — link when suggesting next steps
- [risk calculator](/tools/risk-calculator) — link when discussing risk management
- [student results](/results) — link when mentioning student outcomes
- [free ICT crash course](/crash-course) — link when suggesting free resources
${existingTitles.length > 0 ? `- RELATED POSTS (link to 2-3 relevant ones naturally in the body):\n${existingTitles.slice(0, 15).map(t => `  - [${t.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ")}](/trading-insights/${t})`).join("\n")}` : ""}
Write 1200-1800 words, first person as Harvest. Structure to match the POST TYPE format.
TITLE RULES: The "title" field MUST be under 60 characters. Short and punchy. Do NOT stuff keywords. The "seoTitle" can be slightly longer (max 70 chars) and more keyword-rich.
SEO CRITICAL: Target keyword MUST appear in first paragraph, first ## header, and 3-5 times naturally in body.
INTERNAL LINKING: Include 2-3 links to the related posts above where they naturally fit in context.
Include 1-2 EXTERNAL LINKS to authoritative sources (TradingView, Investopedia, BabyPips, CME Group).
Return ONLY JSON: { "title": "...", "seoTitle": "...", "excerpt": "...", "seoDescription": "...", "seoKeywords": [...], "tags": [...], "postType": "...", "body": "...", "imagePrompts": ["...", "..."] }`,
        }],
      });

      let articleText = articleResponse.content[0].type === "text" ? articleResponse.content[0].text : "";
      articleText = articleText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
      const article = JSON.parse(articleText);
      const slug = `${date}-${slugify(article.title)}`;

      // Generate images
      let coverImage = "", img1Path = "", img2Path = "";
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        async function genImage(prompt: string, filename: string): Promise<string> {
          try {
            const res = await ai.models.generateContent({
              model: "gemini-2.5-flash-image",
              contents: `${prompt}. Style: Dark navy (#0d2137) and gold (#c9a84c). No text.`,
              config: { responseModalities: ["TEXT", "IMAGE"] },
            });
            for (const part of res.candidates?.[0]?.content?.parts ?? []) {
              if (part.inlineData) {
                await commitFile(`public/blog/${filename}`, part.inlineData.data!, `Image used: ${prompt.slice(0, 40)}`, true);
                return `/blog/${filename}`;
              }
            }
          } catch {}
          return "";
        }
        [coverImage, img1Path, img2Path] = await Promise.all([
          genImage(`Blog cover: "${article.title}". Landscape 16:9, trading theme`, `${slug}-cover.jpg`),
          article.imagePrompts?.[0] ? genImage(article.imagePrompts[0], `${slug}-img1.jpg`) : Promise.resolve(""),
          article.imagePrompts?.[1] ? genImage(article.imagePrompts[1], `${slug}-img2.jpg`) : Promise.resolve(""),
        ]);
      }

      // Guardrail: fallback cover image if Gemini failed
      if (!coverImage) {
        coverImage = "/og-image.jpg";
      }

      // Replace image placeholders
      let body = article.body;
      body = img1Path ? body.replace(/\(IMAGE_1\)/, `(${img1Path})`) : body.replace(/!\[.*?\]\(IMAGE_1\)\n?/, "");
      body = img2Path ? body.replace(/\(IMAGE_2\)/, `(${img2Path})`) : body.replace(/!\[.*?\]\(IMAGE_2\)\n?/, "");

      // Commit MDX
      const mdxContent = `export const metadata = {
  title: ${JSON.stringify(article.title)},
  seoTitle: ${JSON.stringify(article.seoTitle)},
  date: "${date}",
  excerpt: ${JSON.stringify(article.excerpt)},
  seoDescription: ${JSON.stringify(article.seoDescription)},
  seoKeywords: ${JSON.stringify(article.seoKeywords)},
  coverImage: ${JSON.stringify(coverImage)},
  tags: ${JSON.stringify(article.tags)},
  postType: ${JSON.stringify(article.postType || topicData.postType)},
}

${body}
`;

      await commitFile(`content/blog/${slug}.mdx`, mdxContent, `Auto-generate: ${article.title}`);
      await notifyIndexNow([`/trading-insights/${slug}`, `/sitemap.xml`]).catch(() => {});

      // Post to social
      try {
        await postToAll({ title: article.title, excerpt: article.excerpt, slug, coverImage, tags: article.tags });
      } catch {}
      try {
        const articleUrl = `https://www.r2ftrading.com/trading-insights/${slug}`;
        await postLinkedInArticle(article.title, body, articleUrl);
      } catch {}

      results.push({ topic: topicData.topic, status: "created", slug });
      existingTitles.push(slug); // Avoid duplicate detection for next iteration
    } catch (err) {
      results.push({ topic: topicData.topic, status: `error: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  // Telegram notification
  const created = results.filter(r => r.status === "created");
  if (created.length > 0) {
    try {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const tgChat = process.env.TELEGRAM_OWNER_CHAT_ID;
      if (tgToken && tgChat) {
        const titles = created.map(c => `• ${c.topic.slice(0, 60)}`).join("\n");
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgChat,
            text: `📝 ${created.length} content gap blog posts generated!\n\n${titles}\n\nCheck: r2ftrading.com/admin/posts`,
          }),
        });
      }
    } catch {}
  }

  return NextResponse.json({ created: created.length, results });
}
