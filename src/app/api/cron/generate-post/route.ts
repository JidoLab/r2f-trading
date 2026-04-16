import { NextRequest, NextResponse } from "next/server";
import { commitFile, readFile } from "@/lib/github";
import { notifyIndexNow } from "@/lib/indexnow";
import { postToAll, postLinkedInArticle } from "@/lib/social";
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
      const files = await listFiles("content/blog", ".mdx");
      existingTitles = files.map(f => f.replace(/^content\/blog\//, "").replace(/\.mdx$/, ""));
    } catch { /* no posts yet */ }

    // Pick topic using Claude — now with market context
    const anthropic = new Anthropic();
    const date = new Date().toISOString().split("T")[0];
    const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

    // Fetch market trends and economic calendar
    let marketContext = "";
    try {
      const { buildMarketContext } = await import("@/lib/market-trends");
      marketContext = await buildMarketContext();
    } catch {}

    const topicResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a content strategist for R2F Trading, a professional ICT trading coaching website.
TODAY: ${dayOfWeek}, ${month}
EXISTING POSTS (avoid repeats): ${existingTitles.slice(0, 20).join(", ") || "None"}
${marketContext}

Generate ONE fresh blog topic.

CRITICAL RULES:
1. TITLE MUST be under 60 characters. Short, punchy, curiosity-driven. Examples: "Why Your FVGs Keep Failing", "The 1% Rule That Changed Everything", "ICT Killzones: A Complete Guide", "5 Signs You're Overtrading"
2. DO NOT write another CPI, NFP, or FOMC article if one already exists in the list above. Economic events are fine occasionally (max 1 per week) but DIVERSIFY topics.
3. Market context below is for INSPIRATION only, not a mandate. Most posts should be EVERGREEN educational content.

TOPIC DIVERSITY — rotate through these categories evenly:
- ICT Concepts (order blocks, FVGs, liquidity, killzones, breaker blocks, OTE)
- Trading Psychology (mindset, discipline, fear, greed, revenge trading)
- Risk Management (position sizing, drawdown, risk-reward, account protection)
- Funded Accounts (prop firm tips, challenge strategies, payout stories)
- Beginner Guides (getting started, platform setup, terminology)
- Market Analysis (specific pair/asset analysis, session breakdowns)
- Personal Stories (lessons learned, failures, breakthroughs)

POST TYPES — cycle through these (pick one NOT recently used):
how-to, listicle, case-study, comparison, faq, personal-story, checklist, myth-buster

Return ONLY a JSON object: { "topic": "...", "category": "...", "postType": "...", "angle": "...", "targetKeyword": "..." }`,
      }],
    });

    let topicText = topicResponse.content[0].type === "text" ? topicResponse.content[0].text : "";
    topicText = topicText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    const topicData = JSON.parse(topicText);

    // Guardrail: duplicate topic detection — check if a very similar slug already exists
    const proposedSlug = slugify(topicData.topic);
    const slugWords = proposedSlug.split("-").filter((w: string) => w.length > 3);
    const isDuplicate = existingTitles.some(existing => {
      const existingWords = existing.replace(/^\d{4}-\d{2}-\d{2}-/, "").split("-").filter(w => w.length > 3);
      const overlap = slugWords.filter((w: string) => existingWords.includes(w)).length;
      return overlap >= Math.min(4, slugWords.length * 0.6);
    });

    if (isDuplicate) {
      console.log(`[cron] Skipping duplicate topic: "${topicData.topic}" — too similar to existing post`);
      return NextResponse.json({ skipped: true, reason: "Duplicate topic detected", topic: topicData.topic });
    }

    // Generate article
    const articleResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      messages: [{
        role: "user",
        content: `Write a blog article for R2F Trading (r2ftrading.com).
AUTHOR: Harvest Wright — sole mentor, 10+ years ICT trading experience, TradingView Editors' Pick, Top 1% in competitions, FTMO Challenge passer.
TOPIC: "${topicData.topic}" | CATEGORY: ${topicData.category} | POST TYPE: ${topicData.postType || "how-to"} | ANGLE: ${topicData.angle} | KEYWORD: "${topicData.targetKeyword}" | DATE: ${date}
COACHING: Lite $150/week, Pro $200/week, Full Mentorship $1,000/4 months.
INTERNAL LINKS (use 2-4 of these naturally within the article body):
- [coaching plans](/coaching) — link when mentioning mentorship/coaching
- [book a free discovery call](/contact) — link when suggesting next steps
- [trading insights](/trading-insights) — link when referencing more content
- [student results](/results) — link when mentioning student outcomes
${existingTitles.length > 0 ? `- RELATED POSTS (link to 2-3 relevant ones naturally in the body):\n${existingTitles.slice(0, 15).map(t => `  - [${t.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ")}](/trading-insights/${t})`).join("\n")}` : ""}
Write 1200-1800 words, first person as Harvest. Structure to match the POST TYPE format.

STRUCTURAL VARIATION — CRITICAL for SEO:
- Vary the number of H2 sections (3-7, not always the same count)
- Vary paragraph lengths (mix short 1-2 sentence paragraphs with longer ones)
- For how-to and checklist: use numbered steps
- For listicle: use H3 sub-headers under H2s
- For case-study and personal-story: use narrative flow with fewer headers
- For faq: use Q&A format with bold questions
- For myth-buster: use "Myth:" / "Reality:" formatting
- Do NOT follow the same template every time — deliberately vary structure

ANSWER BLOCK — Include a "Key Takeaway" callout near the TOP of the article (after the first paragraph), formatted as:
> **Key Takeaway:** [1-2 sentence direct answer to the main question this article addresses]
This helps the article get cited in AI search results (Google AI Overviews, ChatGPT, Perplexity).

E-E-A-T SIGNALS — Include at least ONE of these per article:
- A specific personal trading example with numbers (e.g., "I took a 0.5% risk on EURUSD last Tuesday...")
- A reference to your student outcomes (e.g., "3 of my students passed FTMO this month using this approach")
- A proprietary observation from your 10+ years of experience that isn't in textbooks

TITLE RULES: The "title" field MUST be under 60 characters. Short and punchy. Do NOT stuff keywords. The "seoTitle" can be slightly longer (max 70 chars) and more keyword-rich.
SEO CRITICAL: Target keyword MUST appear in first paragraph, first ## header, and 3-5 times naturally in body.
INTERNAL LINKING: Include 2-3 links to the related posts above where they naturally fit in context. This helps SEO.
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
            model: "gemini-2.5-flash-image",
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

    // Guardrail: if cover image generation failed, use fallback
    if (!coverImage) {
      coverImage = "/og-image.jpg";
      console.log("[cron] Cover image generation failed — using fallback /og-image.jpg");
    }

    // Replace image placeholders
    let body = article.body;
    body = img1Path ? body.replace(/\(IMAGE_1\)/, `(${img1Path})`) : body.replace(/!\[.*?\]\(IMAGE_1\)\n?/, "");
    body = img2Path ? body.replace(/\(IMAGE_2\)/, `(${img2Path})`) : body.replace(/!\[.*?\]\(IMAGE_2\)\n?/, "");

    // Auto-insert library images into the article body
    try {
      const { findMatchingImages, markImageUsed } = await import("@/lib/image-library");
      const keywords = [
        ...(article.tags || []),
        topicData.targetKeyword,
      ].filter(Boolean);

      const libraryImages = await findMatchingImages(keywords, { limit: 2 });
      if (libraryImages.length > 0) {
        // Find H2 headings and insert images after the 2nd and 4th
        const h2Regex = /^## .+$/gm;
        let h2Index = 0;
        const insertPositions: { position: number; image: typeof libraryImages[0] }[] = [];

        let match;
        while ((match = h2Regex.exec(body)) !== null) {
          h2Index++;
          // Insert after 2nd H2 (index 0 of libraryImages) and 4th H2 (index 1)
          if (h2Index === 2 && libraryImages[0]) {
            insertPositions.push({ position: match.index + match[0].length, image: libraryImages[0] });
          } else if (h2Index === 4 && libraryImages[1]) {
            insertPositions.push({ position: match.index + match[0].length, image: libraryImages[1] });
          }
        }

        // Insert in reverse order so positions stay valid
        for (const { position, image } of insertPositions.reverse()) {
          const imgMarkdown = `\n\n![${image.description}](${image.url})\n`;
          body = body.slice(0, position) + imgMarkdown + body.slice(position);
          await markImageUsed(image.id);
        }

        console.log(`[cron] Inserted ${insertPositions.length} library image(s) into article`);
      }
    } catch (imgErr) {
      console.error("[cron] Library image insertion error:", imgErr);
    }

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

    // Auto-post to social media — MUST await, otherwise Vercel kills the function before it completes
    let socialResults = null;
    try {
      socialResults = await postToAll({ title: article.title, excerpt: article.excerpt, slug, coverImage, tags: article.tags });
      console.log("[cron] Social results:", JSON.stringify(socialResults));
    } catch (err) {
      console.error("[cron] Social posting error:", err);
    }

    // Auto-post LinkedIn native article (full text, not link share — favored by LinkedIn algorithm)
    let linkedInArticleResult = null;
    try {
      const articleUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.r2ftrading.com"}/trading-insights/${slug}`;
      linkedInArticleResult = await postLinkedInArticle(article.title, body, articleUrl);
      console.log("[cron] LinkedIn article result:", JSON.stringify(linkedInArticleResult));
    } catch (err) {
      console.error("[cron] LinkedIn article posting error:", err);
    }

    // Auto-post Twitter/X thread — wrapped in try/catch so it doesn't break blog generation
    let threadResult = null;
    try {
      const { generateThread, postThread } = await import("@/lib/twitter-threads");
      const tweets = await generateThread(article.title, body, slug);
      threadResult = await postThread(tweets);
      console.log("[cron] Thread result:", JSON.stringify(threadResult));
    } catch (err) {
      console.error("[cron] Thread posting error:", err);
    }

    // Auto-generate infographic from the blog post
    let infographicResult = null;
    try {
      const takeawayRes = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Extract 3-5 key takeaways from this trading article. Each should be a concise, actionable insight (under 80 characters each). Return ONLY a JSON array of strings.

TITLE: ${article.title}

ARTICLE:
${body.slice(0, 3000)}`,
        }],
      });

      let takeawayText = takeawayRes.content[0].type === "text" ? takeawayRes.content[0].text : "[]";
      takeawayText = takeawayText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
      const takeaways: string[] = JSON.parse(takeawayText);

      if (takeaways.length >= 3) {
        const infographicParams = new URLSearchParams({
          title: article.title,
          points: takeaways.join("|"),
        });
        const infographicUrl = `https://r2ftrading.com/infographic/${slug}?${infographicParams.toString()}`;

        // Fetch the rendered infographic image
        const imgRes = await fetch(infographicUrl);
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(imgBuffer).toString("base64");
          await commitFile(`public/infographics/${slug}.png`, base64, `Add infographic: ${slug}`, true);
          infographicResult = { url: `/infographics/${slug}.png`, points: takeaways.length };
          console.log("[cron] Infographic generated:", slug);
        }
      }
    } catch (infErr) {
      console.error("[cron] Infographic generation error:", infErr);
    }

    // Occasionally generate a landing page instead of only a blog post (1 in 5 runs)
    let landingPageResult = null;
    try {
      if (Math.random() < 0.2) {
        const { listFiles: listGhFiles } = await import("@/lib/github");

        // Pick a trending keyword from market context or topic matrix
        const landingTopics = [
          { topic: "How to identify and trade ICT order blocks", keyword: "ICT order blocks" },
          { topic: "FTMO challenge tips and strategies for passing", keyword: "FTMO challenge tips" },
          { topic: "How to trade during ICT killzones for optimal entries", keyword: "killzone trading" },
          { topic: "Understanding fair value gaps in ICT trading", keyword: "fair value gaps" },
          { topic: "Liquidity sweep trading strategy using ICT concepts", keyword: "liquidity sweep trading" },
          { topic: "ICT breaker block identification and trading guide", keyword: "ICT breaker blocks" },
          { topic: "Smart money concepts for forex traders", keyword: "smart money concepts" },
          { topic: "How to pass prop firm challenges consistently", keyword: "prop firm challenge" },
          { topic: "ICT optimal trade entry setup guide", keyword: "ICT optimal trade entry" },
          { topic: "Trading psychology tips for funded traders", keyword: "trading psychology" },
        ];

        // Check which pages already exist
        let existingSlugs: string[] = [];
        try {
          const existingFiles = await listGhFiles("data/landing-pages", ".json");
          existingSlugs = existingFiles.map((f) =>
            f.replace(/^data\/landing-pages\//, "").replace(/\.json$/, "")
          );
        } catch { /* directory might not exist */ }

        const available = landingTopics.filter(
          (t) => !existingSlugs.includes(t.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
        );

        if (available.length > 0) {
          const pick = available[Math.floor(Math.random() * available.length)];
          const lpSlug = pick.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

          const lpResponse = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 2000,
            messages: [{
              role: "user",
              content: `You are a content strategist for R2F Trading (r2ftrading.com), an ICT trading coaching business run by Harvest Wright.

Generate a landing page for the topic: "${pick.topic}"
Target keyword: "${pick.keyword}"

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
- Headline should be benefit-driven
- All copy should speak to forex/futures traders learning ICT methodology
- Include the target keyword naturally in the seoTitle, seoDescription, and headline
- Icons should be relevant emojis`,
            }],
          });

          let lpText = lpResponse.content[0].type === "text" ? lpResponse.content[0].text : "";
          lpText = lpText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
          const lpData = JSON.parse(lpText);

          const pageData = {
            slug: lpSlug,
            title: lpData.title,
            seoTitle: lpData.seoTitle,
            seoDescription: lpData.seoDescription,
            headline: lpData.headline,
            subheadline: lpData.subheadline,
            keyPoints: lpData.keyPoints,
            relatedTags: lpData.relatedTags,
            testimonialIndex: Math.floor(Math.random() * 4),
            createdAt: new Date().toISOString(),
            targetKeyword: pick.keyword,
          };

          await commitFile(
            `data/landing-pages/${lpSlug}.json`,
            JSON.stringify(pageData, null, 2),
            `Auto-generate landing page: ${lpData.title}`
          );

          try {
            const { notifyIndexNow: notifyLP } = await import("@/lib/indexnow");
            await notifyLP([`/learn/${lpSlug}`, `/sitemap.xml`]);
          } catch { /* optional */ }

          landingPageResult = { slug: lpSlug, title: lpData.title };
          console.log("[cron] Landing page generated:", lpSlug);
        }
      }
    } catch (lpErr) {
      console.error("[cron] Landing page generation error:", lpErr);
    }

    return NextResponse.json({ success: true, title: article.title, slug, socialResults, linkedInArticleResult, threadResult, infographicResult, landingPageResult });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
