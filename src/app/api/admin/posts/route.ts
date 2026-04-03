import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getAllPosts } from "@/lib/blog";
import { commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const TOPIC_MATRIX = [
  { category: "ICT Concepts", topics: ["Understanding Fair Value Gaps and How to Trade Them", "Liquidity Sweeps: How Smart Money Hunts Stop Losses", "Market Structure Shifts Explained for ICT Traders", "How to Use ICT Killzones for Optimal Entry Timing", "The Power of Breaker Blocks in ICT Trading", "ICT Optimal Trade Entry: Finding High-Probability Setups", "Understanding Displacement and How It Signals Institutional Activity"] },
  { category: "Trading Psychology", topics: ["Why Most Traders Fail: The Psychology Behind Consistent Losses", "Building a Winning Mindset: Mental Frameworks for Traders", "How to Handle Losing Streaks Without Blowing Your Account", "The Role of Patience in Profitable Trading", "Overcoming Fear of Missing Out (FOMO) in Trading", "Emotional Detachment: Trading Like a Professional", "Journal Your Way to Profits: The Power of Trade Journaling"] },
  { category: "Risk Management", topics: ["Position Sizing: The Most Important Skill No One Teaches", "Risk-to-Reward Ratios: What Actually Matters", "How to Protect Your Funded Account from Drawdown", "Building a Risk Management Plan That Actually Works", "The 1% Rule and Why It Transforms Your Trading", "Scaling In and Out of Positions: A Practical Guide"] },
  { category: "Funded Accounts", topics: ["How to Pass Your First Prop Firm Challenge", "FTMO vs Other Prop Firms: What to Consider", "Common Mistakes That Fail Funded Account Challenges", "Managing a Funded Account Like a Business", "From Prop Firm Challenge to Consistent Payouts: A Roadmap", "The Truth About Funded Trading: What They Don't Tell You"] },
  { category: "Market Analysis", topics: ["How to Read Price Action Like an Institutional Trader", "Multi-Timeframe Analysis: A Step-by-Step Approach", "Understanding Forex Sessions and Their Impact on Volatility", "Gold (XAUUSD) Trading Strategies Using ICT Concepts", "How Economic Events Affect Your ICT Setups", "Reading Candlestick Patterns Through the ICT Lens"] },
];

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
    // Pick random topic
    const existingPosts = getAllPosts();
    const usedTitles = existingPosts.map((p) => p.title.toLowerCase());
    const allTopics = TOPIC_MATRIX.flatMap((cat) => cat.topics.map((t) => ({ category: cat.category, topic: t })));
    const unused = allTopics.filter((t) => !usedTitles.some((u) => u.includes(slugify(t.topic).slice(0, 20))));
    const pool = unused.length > 0 ? unused : allTopics;
    const { category, topic } = pool[Math.floor(Math.random() * pool.length)];

    // Generate article with Claude
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 5000,
      messages: [{
        role: "user",
        content: `Write a blog article for R2F Trading (Road 2 Funded), a professional ICT trading coaching website run by Harvest, a mentor with 10+ years of experience.

Topic: "${topic}"
Category: ${category}

CONTENT REQUIREMENTS:
- Write 1000-1500 words of high-quality, SEO-optimized content
- Use markdown formatting with ## and ### headers, bullet points, bold text, and blockquotes
- Include 2-3 natural internal links: [coaching plans](/coaching), [book a free discovery call](/contact), [trading insights](/trading-insights)
- Write in first person as Harvest, an experienced ICT trader and mentor
- Be educational but accessible
- Include actionable takeaways
- End with a compelling call-to-action

SEO REQUIREMENTS:
- Title: 50-60 characters, include primary keyword near the start
- Meta description: 150-155 characters
- Include 3-5 SEO keywords
- Structure headers with H2/H3 for featured snippet potential

IMAGE PLACEMENT:
- Provide exactly 2 image prompts for illustrations
- Mark where images go in the body with: ![image-1-alt-text](IMAGE_1) and ![image-2-alt-text](IMAGE_2)

Return ONLY a JSON object (no markdown code fences) with these fields:
{
  "title": "Article display title",
  "seoTitle": "SEO-optimized page title (50-60 chars)",
  "excerpt": "Excerpt for blog cards (100-120 chars)",
  "seoDescription": "Meta description (150-155 chars)",
  "seoKeywords": ["keyword1", "keyword2", "keyword3"],
  "tags": ["tag1", "tag2", "tag3"],
  "body": "The full article in markdown with IMAGE_1 and IMAGE_2 placeholders",
  "imagePrompts": ["Prompt for image 1", "Prompt for image 2"]
}`,
      }],
    });

    let text = response.content[0].type === "text" ? response.content[0].text : "";
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    const article = JSON.parse(text);

    const date = new Date().toISOString().split("T")[0];
    const slug = `${date}-${slugify(article.title)}`;

    // Generate images with Gemini and commit to GitHub
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
        } catch { /* skip failed images */ }
        return "";
      }

      [coverImage, img1Path, img2Path] = await Promise.all([
        genImage(`Blog cover for: "${article.title}". Landscape 16:9, abstract trading theme`, `${slug}-cover.jpg`),
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

    // Commit MDX file to GitHub
    await commitFile(
      `content/blog/${slug}.mdx`,
      mdxContent,
      `Add blog post: ${article.title}`
    );

    return NextResponse.json({
      success: true,
      title: article.title,
      category,
      topic,
      slug,
      imageCount: [coverImage, img1Path, img2Path].filter(Boolean).length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
