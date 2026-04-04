import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getAllPosts } from "@/lib/blog";
import { commitFile } from "@/lib/github";
import { notifyIndexNow } from "@/lib/indexnow";
import { postToAll } from "@/lib/social";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const posts = getAllPosts();
  return NextResponse.json({ posts });
}

export async function POST() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const existingPosts = getAllPosts();
    const existingTitles = existingPosts.map((p) => `- "${p.title}" (${p.tags.join(", ")})`).join("\n");
    const existingSlugs = existingPosts.slice(0, 10).map((p) => ({
      title: p.title,
      slug: p.slug,
    }));

    const today = new Date();
    const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });
    const month = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const date = today.toISOString().split("T")[0];

    // STEP 1: Topic ideation — Claude picks a fresh, relevant topic
    const anthropic = new Anthropic();
    const topicResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a content strategist for R2F Trading, a professional ICT (Inner Circle Trader) coaching website.

TODAY: ${dayOfWeek}, ${month}
SITE: r2ftrading.com — run by Harvest Wright, 10+ years trading experience, offers 1-on-1 ICT coaching ($150-$1000/mo)

EXISTING ARTICLES (do NOT repeat these):
${existingTitles || "None yet"}

Generate ONE fresh blog topic. Consider:
- Current market relevance (what traders are thinking about right now in ${month})
- Seasonal trading patterns (end of quarter, NFP weeks, holiday markets, year-start goal-setting, etc.)
- Mix of evergreen education + timely commentary
- Topics that naturally lead readers toward coaching (conversion-focused)
- Long-tail SEO opportunities in the ICT/funded trading niche
- Pain points: losing streaks, prop firm fails, information overload, strategy hopping, emotional trading

CATEGORIES to rotate through: ICT Concepts, Trading Psychology, Risk Management, Funded Account Strategies, Market Analysis, Trading Lifestyle, Strategy Development

Return ONLY a JSON object:
{
  "topic": "The specific topic",
  "category": "Category name",
  "angle": "What makes this timely or unique (1 sentence)",
  "targetKeyword": "Primary SEO keyword phrase"
}`,
      }],
    });

    let topicText = topicResponse.content[0].type === "text" ? topicResponse.content[0].text : "";
    topicText = topicText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    const topicData = JSON.parse(topicText);

    // STEP 2: Generate the full article with cross-linking
    const internalLinks = existingSlugs.length > 0
      ? `\nEXISTING ARTICLES TO LINK TO (pick 1-2 naturally relevant ones):
${existingSlugs.map((p) => `- [${p.title}](/trading-insights/${p.slug})`).join("\n")}`
      : "";

    const articleResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 5000,
      messages: [{
        role: "user",
        content: `Write a blog article for R2F Trading (r2ftrading.com).

AUTHOR: Harvest Wright — sole mentor, 10+ years ICT trading experience, TradingView Editors' Pick winner, Top 1% in trading competitions, FTMO Challenge passer. Passionate about helping traders go from confused to consistently profitable.

TOPIC: "${topicData.topic}"
CATEGORY: ${topicData.category}
ANGLE: ${topicData.angle}
TARGET KEYWORD: "${topicData.targetKeyword}"
TODAY'S DATE: ${date}

COACHING SERVICES TO REFERENCE NATURALLY:
- Lite Plan: $150/week — 1 session/week, great for beginners
- Pro Plan: $200/week — 2 sessions/week with live market walkthroughs
- Full Mentorship: $1,000/4 months — complete transformation program with free FTMO Challenge

MANDATORY INTERNAL LINKS (weave 2-3 naturally into the content):
- [coaching plans](/coaching) — when mentioning structured learning or getting help
- [book a free discovery call](/contact) — when mentioning next steps or personalized guidance
- [trading insights](/trading-insights) — when referencing educational content generally
${internalLinks}

CONTENT REQUIREMENTS:
- 1200-1800 words of genuinely valuable, SEO-optimized content
- Write in first person as Harvest — confident but approachable, not salesy
- Share specific ICT concepts (order blocks, FVGs, liquidity, market structure, killzones) when relevant — explain each briefly for beginners
- Include at least one real-world example or scenario a trader would recognize
- Use ## and ### headers strategically for featured snippets
- Use bullet points, bold text, and blockquotes for scannability
- Short paragraphs (2-3 sentences max)
- End with a CTA that feels helpful, not pushy

SEO REQUIREMENTS:
- seoTitle: 50-60 chars with target keyword near the front
- seoDescription: 150-155 chars, compelling with implied benefit
- 4-5 specific long-tail SEO keywords
- FAQ-style headers where appropriate (Google loves these)

IMAGE PLACEMENT:
- Provide exactly 2 descriptive image prompts for trading-related illustrations
- Mark placement with: ![descriptive-alt-text](IMAGE_1) and ![descriptive-alt-text](IMAGE_2)

Return ONLY a JSON object (no code fences):
{
  "title": "Display title",
  "seoTitle": "SEO page title (50-60 chars)",
  "excerpt": "Card excerpt (100-120 chars)",
  "seoDescription": "Meta description (150-155 chars)",
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "tags": ["tag1", "tag2", "tag3"],
  "body": "Full article markdown with IMAGE_1 and IMAGE_2 placeholders",
  "imagePrompts": ["Prompt for image 1", "Prompt for image 2"]
}`,
      }],
    });

    let articleText = articleResponse.content[0].type === "text" ? articleResponse.content[0].text : "";
    articleText = articleText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    const article = JSON.parse(articleText);

    const slug = `${date}-${slugify(article.title)}`;

    // STEP 3: Generate images
    let coverImage = "";
    let img1Path = "";
    let img2Path = "";
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      async function genImage(prompt: string, filename: string): Promise<string> {
        try {
          const res = await ai.models.generateContent({
            model: "gemini-3.1-flash-image-preview",
            contents: `${prompt}. Style: Clean, professional, dark navy (#0d2137) and gold (#c9a84c) color scheme. No text overlays.`,
            config: { responseModalities: ["TEXT", "IMAGE"] },
          });
          const parts = res.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (part.inlineData) {
              await commitFile(
                `public/blog/${filename}`,
                part.inlineData.data!,
                `Add blog image: ${filename}`,
                true
              );
              return `/blog/${filename}`;
            }
          }
        } catch { /* skip */ }
        return "";
      }

      [coverImage, img1Path, img2Path] = await Promise.all([
        genImage(`Blog cover: "${article.title}". Landscape 16:9, abstract trading/finance theme`, `${slug}-cover.jpg`),
        article.imagePrompts?.[0] ? genImage(article.imagePrompts[0], `${slug}-img1.jpg`) : Promise.resolve(""),
        article.imagePrompts?.[1] ? genImage(article.imagePrompts[1], `${slug}-img2.jpg`) : Promise.resolve(""),
      ]);
    }

    // Replace image placeholders
    let body = article.body;
    body = img1Path ? body.replace(/\(IMAGE_1\)/, `(${img1Path})`) : body.replace(/!\[.*?\]\(IMAGE_1\)\n?/, "");
    body = img2Path ? body.replace(/\(IMAGE_2\)/, `(${img2Path})`) : body.replace(/!\[.*?\]\(IMAGE_2\)\n?/, "");

    // Assemble MDX
    const mdxContent = `export const metadata = {
  title: ${JSON.stringify(article.title)},
  seoTitle: ${JSON.stringify(article.seoTitle)},
  date: "${date}",
  excerpt: ${JSON.stringify(article.excerpt)},
  seoDescription: ${JSON.stringify(article.seoDescription)},
  seoKeywords: ${JSON.stringify(article.seoKeywords)},
  coverImage: ${JSON.stringify(coverImage)},
  tags: ${JSON.stringify(article.tags)},
}

${body}
`;

    // Commit to GitHub
    await commitFile(
      `content/blog/${slug}.mdx`,
      mdxContent,
      `Add blog post: ${article.title}`
    );

    // Notify search engines via IndexNow
    await notifyIndexNow([`/trading-insights/${slug}`, `/trading-insights`, `/sitemap.xml`]);

    // Auto-post to social media (fire and forget)
    postToAll({ title: article.title, excerpt: article.excerpt, slug, coverImage, tags: article.tags }).catch(() => {});

    return NextResponse.json({
      success: true,
      title: article.title,
      category: topicData.category,
      topic: topicData.topic,
      angle: topicData.angle,
      slug,
      imageCount: [coverImage, img1Path, img2Path].filter(Boolean).length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
