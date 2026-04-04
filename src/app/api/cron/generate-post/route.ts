import { NextRequest, NextResponse } from "next/server";
import { commitFile, readFile } from "@/lib/github";
import { notifyIndexNow } from "@/lib/indexnow";
import { postToAll } from "@/lib/social";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

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

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if auto-generation is enabled
  try {
    const configRaw = await readFile("config/auto-generate.json");
    const config = JSON.parse(configRaw);
    if (!config.enabled) {
      return NextResponse.json({ skipped: true, reason: "Auto-generation is disabled" });
    }
  } catch {
    // Config doesn't exist = disabled by default
    return NextResponse.json({ skipped: true, reason: "Auto-generation not configured" });
  }

  try {
    // Get existing post titles to avoid duplicates
    let existingTitles: string[] = [];
    try {
      const { listFiles } = await import("@/lib/github");
      const files = await listFiles("content/blog");
      existingTitles = files.map(f => f.replace(/\.mdx$/, ""));
    } catch { /* no posts yet */ }

    // Pick topic using Claude
    const anthropic = new Anthropic();
    const date = new Date().toISOString().split("T")[0];
    const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

    const topicResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a content strategist for R2F Trading, a professional ICT trading coaching website.
TODAY: ${dayOfWeek}, ${month}
EXISTING POSTS (avoid repeats): ${existingTitles.slice(0, 20).join(", ") || "None"}
Generate ONE fresh blog topic considering current market relevance and seasonal patterns.

POST TYPES — cycle through these (pick one NOT recently used):
how-to, listicle, case-study, comparison, faq, roundup, personal-story, trends, checklist

Return ONLY a JSON object: { "topic": "...", "category": "...", "postType": "...", "angle": "...", "targetKeyword": "..." }`,
      }],
    });

    let topicText = topicResponse.content[0].type === "text" ? topicResponse.content[0].text : "";
    topicText = topicText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    const topicData = JSON.parse(topicText);

    // Generate article
    const articleResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 5000,
      messages: [{
        role: "user",
        content: `Write a blog article for R2F Trading (r2ftrading.com).
AUTHOR: Harvest Wright — sole mentor, 10+ years ICT trading experience, TradingView Editors' Pick, Top 1% in competitions, FTMO Challenge passer.
TOPIC: "${topicData.topic}" | CATEGORY: ${topicData.category} | POST TYPE: ${topicData.postType || "how-to"} | ANGLE: ${topicData.angle} | KEYWORD: "${topicData.targetKeyword}" | DATE: ${date}
COACHING: Lite $150/week, Pro $200/week, Full Mentorship $1,000/4 months.
INTERNAL LINKS: [coaching plans](/coaching), [book a free discovery call](/contact), [trading insights](/trading-insights)
Write 1200-1800 words, first person as Harvest. Structure to match the POST TYPE format.
SEO CRITICAL: Target keyword MUST appear in first paragraph, first ## header, and 3-5 times naturally in body.
Include 1-2 EXTERNAL LINKS to authoritative sources (TradingView, Investopedia, BabyPips, CME Group).
IMAGE alt text must be keyword-rich and descriptive, not generic.
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
            model: "gemini-3.1-flash-image-preview",
            contents: `${prompt}. Style: Dark navy (#0d2137) and gold (#c9a84c). No text.`,
            config: { responseModalities: ["TEXT", "IMAGE"] },
          });
          for (const part of res.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData) {
              await commitFile(`public/blog/${filename}`, part.inlineData.data!, `Add: ${filename}`, true);
              return `/blog/${filename}`;
            }
          }
        } catch { /* skip */ }
        return "";
      }
      [coverImage, img1Path, img2Path] = await Promise.all([
        genImage(`Blog cover: "${article.title}". Landscape 16:9, trading theme`, `${slug}-cover.jpg`),
        article.imagePrompts?.[0] ? genImage(article.imagePrompts[0], `${slug}-img1.jpg`) : Promise.resolve(""),
        article.imagePrompts?.[1] ? genImage(article.imagePrompts[1], `${slug}-img2.jpg`) : Promise.resolve(""),
      ]);
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
  postType: ${JSON.stringify(article.postType || topicData.postType || "how-to")},
}

${body}
`;

    await commitFile(`content/blog/${slug}.mdx`, mdxContent, `Auto-generate: ${article.title}`);

    // Notify search engines via IndexNow
    await notifyIndexNow([`/trading-insights/${slug}`, `/trading-insights`, `/sitemap.xml`]);

    // Auto-post to social media (fire and forget)
    postToAll({ title: article.title, excerpt: article.excerpt, slug, coverImage, tags: article.tags }).catch(() => {});

    return NextResponse.json({ success: true, title: article.title, slug });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
