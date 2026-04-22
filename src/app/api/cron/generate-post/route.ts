import { NextRequest, NextResponse } from "next/server";
import { commitFile, readFile } from "@/lib/github";
import { notifyIndexNow } from "@/lib/indexnow";
import { postToAll, postLinkedInArticle } from "@/lib/social";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { getCurrentDateContext } from "@/lib/date-context";

export const maxDuration = 300;

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
    const dateContext = getCurrentDateContext();

    // Fetch market trends and economic calendar
    let marketContext = "";
    try {
      const { buildMarketContext } = await import("@/lib/market-trends");
      marketContext = await buildMarketContext();
    } catch {}

    // Determine which categories and post types have been used recently
    const recentCategories = existingTitles.slice(0, 8).map(t => {
      const words = t.replace(/^\d{4}-\d{2}-\d{2}-/, "").split("-");
      if (words.some(w => ["fvg", "order", "block", "liquidity", "killzone", "breaker", "ote", "displacement"].includes(w))) return "ICT Concepts";
      if (words.some(w => ["psychology", "mindset", "discipline", "fear", "revenge", "emotion", "patience"].includes(w))) return "Trading Psychology";
      if (words.some(w => ["risk", "position", "sizing", "drawdown"].includes(w))) return "Risk Management";
      if (words.some(w => ["funded", "ftmo", "prop", "firm", "challenge", "payout"].includes(w))) return "Funded Accounts";
      if (words.some(w => ["beginner", "start", "basic", "learn", "guide"].includes(w))) return "Beginner Guides";
      return "Other";
    });
    const categoryCount: Record<string, number> = {};
    recentCategories.forEach(c => { categoryCount[c] = (categoryCount[c] || 0) + 1; });
    const leastUsedCategory = ["ICT Concepts", "Trading Psychology", "Risk Management", "Funded Accounts", "Beginner Guides", "Personal Stories", "Market Analysis"]
      .sort((a, b) => (categoryCount[a] || 0) - (categoryCount[b] || 0))[0];

    // Topic selection with retry — Claude occasionally picks a topic too close
    // to an existing post. Instead of bailing (skipping the whole day's post),
    // retry up to 3 times, feeding the rejected topic back into the prompt.
    const rejectedTopics: string[] = [];
    const MAX_TOPIC_ATTEMPTS = 3;
    let topicData: { topic: string; category: string; postType: string; angle: string; targetKeyword: string; searchIntent: string; uniqueInsight: string } | null = null;

    for (let attempt = 1; attempt <= MAX_TOPIC_ATTEMPTS; attempt++) {
      const rejectedBlock = rejectedTopics.length > 0
        ? `\n\nREJECTED TOPICS from this run (do NOT re-propose anything similar to these):\n${rejectedTopics.map((t, i) => `${i + 1}. "${t}"`).join("\n")}\n\nYou MUST pick a meaningfully DIFFERENT angle — different category if possible, different keywords, different hook.`
        : "";

      const topicResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are a content strategist for R2F Trading, a professional ICT trading coaching website with 10+ years of ICT experience.

${dateContext}

TODAY: ${dayOfWeek}, ${month}
EXISTING POSTS (avoid repeats): ${existingTitles.slice(0, 20).join(", ") || "None"}
${marketContext}${rejectedBlock}

Generate ONE fresh blog topic.

QUALITY-FIRST APPROACH — This article must pass Google's test: "Would this content exist if search engines didn't exist?" Choose topics where Harvest's real experience adds unique value.

CRITICAL RULES:
1. TITLE MUST be under 60 characters. Short, punchy, curiosity-driven. Examples: "Why Your FVGs Keep Failing", "The 1% Rule That Changed Everything", "ICT Killzones: A Complete Guide"
2. DO NOT write another CPI, NFP, or FOMC article if one already exists. Economic events max 1 per week.
3. Market context is for INSPIRATION only. Most posts should be EVERGREEN educational content.
4. The ANGLE must describe a UNIQUE perspective that can't be found by summarizing Google page 1 results. Think: what non-obvious observation from years of trading experience won't appear on a YouTube video summary?

STRONG PREFERENCE for category: "${leastUsedCategory}" (least covered recently).

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

SEARCH INTENT — specify one: informational, commercial, navigational, or transactional

Return ONLY a JSON object: { "topic": "...", "category": "...", "postType": "...", "angle": "...", "targetKeyword": "...", "searchIntent": "...", "uniqueInsight": "one sentence describing what makes this article different from everything else on this topic" }`,
        }],
      });

      let topicText = topicResponse.content[0].type === "text" ? topicResponse.content[0].text : "";
      topicText = topicText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
      const candidate = JSON.parse(topicText);

      // Guardrail: duplicate topic detection — check if a very similar slug already exists
      const proposedSlug = slugify(candidate.topic);
      const slugWords = proposedSlug.split("-").filter((w: string) => w.length > 3);
      const isDuplicate = existingTitles.some(existing => {
        const existingWords = existing.replace(/^\d{4}-\d{2}-\d{2}-/, "").split("-").filter(w => w.length > 3);
        const overlap = slugWords.filter((w: string) => existingWords.includes(w)).length;
        return overlap >= Math.min(4, slugWords.length * 0.6);
      });

      if (!isDuplicate) {
        topicData = candidate;
        console.log(`[cron] Topic selected on attempt ${attempt}: "${candidate.topic}"`);
        break;
      }

      console.log(`[cron] Attempt ${attempt}/${MAX_TOPIC_ATTEMPTS}: "${candidate.topic}" rejected as duplicate`);
      rejectedTopics.push(candidate.topic);
    }

    if (!topicData) {
      console.log(`[cron] Gave up after ${MAX_TOPIC_ATTEMPTS} attempts, all duplicates`);
      return NextResponse.json({
        skipped: true,
        reason: `Duplicate topic detected across ${MAX_TOPIC_ATTEMPTS} attempts`,
        rejectedTopics,
      });
    }

    // Generate article
    const articleResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      messages: [{
        role: "user",
        content: `Write a high-quality blog article for R2F Trading (r2ftrading.com).

${dateContext}

AUTHOR: R2F Trading — ICT coaching brand with 10+ years of trading experience, TradingView Editors' Pick recognition, Top 1% competition rankings, and funded trader track record.
TOPIC: "${topicData.topic}" | CATEGORY: ${topicData.category} | POST TYPE: ${topicData.postType || "how-to"} | ANGLE: ${topicData.angle} | KEYWORD: "${topicData.targetKeyword}" | DATE: ${date}
UNIQUE INSIGHT: ${topicData.uniqueInsight || "Share something readers can't find elsewhere"}
SEARCH INTENT: ${topicData.searchIntent || "informational"}
COACHING: Lite $150/week, Pro $200/week, Full Mentorship $1,000/4 months.

═══ QUALITY STANDARD (MOST IMPORTANT) ═══
This article must pass this test: "Would this content exist if search engines didn't exist?"
Write in first person as R2F Trading — conversational, specific, experienced, no fluff.

WHAT MAKES THIS ARTICLE UNIQUE (include ALL of these):
1. A SPECIFIC TRADE EXAMPLE with real numbers — pair, timeframe, entry reason, risk %, outcome. Make it feel like a trade journal entry. Example: "Last Thursday on EURUSD 15m, I saw a FVG form after London open displacement. I entered at 1.0847 with a 12-pip stop, risking 0.5% of my account. The trade ran 3.2R before I took partials at the -OB."
2. A CONTRARIAN OR NUANCED TAKE — don't just explain the concept, challenge conventional wisdom or add a perspective most ICT YouTube creators miss. What does someone with 10 years at this know that a 1-year trader doesn't?
3. A TRADER ARCHETYPE OBSERVATION (vary these) — describe a common mistake pattern you see in the wild. "The trader who keeps getting stopped out on OB entries is almost always entering in premium instead of discount." Make each piece have a different archetype/pattern. NEVER mention students, mentees, coaching clients, or anyone you personally teach.
4. A PRACTICAL FRAMEWORK — not just "what" but "here's exactly how to do it step by step." Include specific entries/exits, timeframes, or mental frameworks the reader can use TODAY.

FORBIDDEN LANGUAGE (these get content flagged as AI/promotional):
- NEVER say "my students", "one of my students", "a student of mine", "in coaching", "my mentees", "students I work with", "a student I had", or any variant.
- NEVER invent student names, initials, or personal anecdotes involving people you taught.
- NEVER ask readers to DM, message, contact you privately. The CTA is always a link on this site.

WHAT TO AVOID (these make content feel AI-generated):
- Generic statements like "Trading requires discipline" without a specific example
- Listing things without explaining WHY each matters
- Using the same sentence structures repeatedly (subject-verb-object, subject-verb-object)
- Paragraphs that could apply to any trading methodology, not specifically ICT
- Platitudes: "consistency is key", "trust the process", "manage your risk" — these are empty without specifics
- Starting multiple paragraphs with "I" or "The"

INTERNAL LINKS (use 2-4 naturally):
- [coaching plans](/coaching) — link when mentioning mentorship/coaching
- [book a free discovery call](/contact) — link when suggesting next steps
- [trading insights](/trading-insights) — link when referencing more content
- [results](/results) — link when referencing outcomes or proof
- [risk calculator](/tools/risk-calculator) — link when discussing position sizing
- [crash course](/crash-course) — link when addressing beginners
${existingTitles.length > 0 ? `- RELATED POSTS (link to 2-3 naturally in body):\n${existingTitles.slice(0, 12).map(t => `  - [${t.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ")}](/trading-insights/${t})`).join("\n")}` : ""}

═══ STRUCTURE ═══
Write 1400-2000 words, first person as Harvest.

ANSWER BLOCK — After the opening paragraph, include:
> **Key Takeaway:** [1-2 sentence direct answer to the main question. Be specific, not vague.]

STRUCTURAL VARIATION (CRITICAL — each article must feel different):
- ${topicData.postType === "how-to" || topicData.postType === "checklist" ? "Use numbered steps with clear action items" : ""}
- ${topicData.postType === "listicle" ? "Use H3 sub-headers under each H2 list item" : ""}
- ${topicData.postType === "case-study" || topicData.postType === "personal-story" ? "Use narrative flow — fewer headers, more storytelling with scene-setting details" : ""}
- ${topicData.postType === "faq" ? "Use bold Q&A format, each question from the perspective of a confused retail trader (not a student)" : ""}
- ${topicData.postType === "myth-buster" ? 'Use "Myth:" / "Reality:" / "What I Actually See:" three-part format' : ""}
- ${topicData.postType === "comparison" ? "Use a comparison table in markdown, then detailed analysis of each option" : ""}
- Vary H2 count (3-7), paragraph lengths, and sentence structures deliberately

WRITING STYLE:
- Mix short punchy sentences (3-8 words) with longer explanatory ones
- Use rhetorical questions to break up sections
- Include at least one moment of vulnerability or honesty ("I used to get this wrong too...")
- End with a specific next step, not a generic CTA

═══ SEO ═══
TITLE: Under 60 characters, curiosity-driven. "seoTitle" can be up to 70 chars.
KEYWORD: "${topicData.targetKeyword}" in first paragraph, first H2, and 3-5x naturally in body.
EXTERNAL LINKS: 1-2 to authoritative sources (TradingView, Investopedia, BabyPips, CME Group).
IMAGE alt text: keyword-rich and descriptive.
META DESCRIPTION ("seoDescription"): 130-155 characters. Start with a specific claim or number. NEVER use "Discover", "Learn", "Master", "Find out", or "Complete guide".

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
          const parts = res.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              await commitFile(`public/blog/${filename}`, part.inlineData.data, `Add: ${filename}`, true);
              console.log(`[cron] Image generated: ${filename} (${part.inlineData.data.length} bytes)`);
              return `/blog/${filename}`;
            }
          }
          // No image returned — log what we got
          console.error(`[cron] Gemini returned no image for ${filename}. Parts:`, parts.map(p => Object.keys(p)).join(", "));
        } catch (err) {
          console.error(`[cron] Gemini error for ${filename}:`, err instanceof Error ? err.message : String(err));
        }
        return "";
      }

      // Generate cover image FIRST (most important) — serial, not parallel, to avoid rate limits + timeout pressure
      coverImage = await genImage(`Blog cover: "${article.title}". Landscape 16:9, trading theme`, `${slug}-cover.jpg`);

      // Body images — still parallel, but only AFTER cover is confirmed
      [img1Path, img2Path] = await Promise.all([
        article.imagePrompts?.[0] ? genImage(article.imagePrompts[0], `${slug}-img1.jpg`) : Promise.resolve(""),
        article.imagePrompts?.[1] ? genImage(article.imagePrompts[1], `${slug}-img2.jpg`) : Promise.resolve(""),
      ]);
    } else {
      console.error("[cron] GEMINI_API_KEY missing — cover image will use fallback");
    }

    // Guardrail: if cover image generation failed, use fallback
    if (!coverImage) {
      coverImage = "/og-image.jpg";
      console.log(`[cron] Cover image generation failed for "${article.title}" — using fallback /og-image.jpg`);
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

    // Auto-create Substack DRAFT (never auto-publishes — user reviews + publishes manually)
    let substackResult = null;
    try {
      const { createSubstackDraft, isSubstackEnabled } = await import("@/lib/substack");
      if (isSubstackEnabled()) {
        const coverImageUrl = coverImage?.startsWith("http")
          ? coverImage
          : coverImage
          ? `https://www.r2ftrading.com${coverImage}`
          : undefined;
        const canonicalNote = `*Originally published at [R2F Trading](https://www.r2ftrading.com/trading-insights/${slug}).*\n\n`;
        substackResult = await createSubstackDraft({
          title: article.title,
          subtitle: article.excerpt || "",
          bodyMarkdown: canonicalNote + body,
          coverImageUrl,
        });
        console.log("[cron] Substack draft:", JSON.stringify(substackResult));

        // Telegram alert when draft is ready
        if (substackResult.success && substackResult.draftUrl) {
          const tgToken = process.env.TELEGRAM_BOT_TOKEN;
          const tgChat = process.env.TELEGRAM_OWNER_CHAT_ID;
          if (tgToken && tgChat) {
            await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: tgChat,
                text: `\u{1F4DD} Substack draft ready for review\n\n"${article.title}"\n\nReview + publish: ${substackResult.draftUrl}`,
                parse_mode: "Markdown",
                disable_web_page_preview: true,
              }),
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error("[cron] Substack draft error:", err);
    }

    // Auto-syndicate to Dev.to + Hashnode (+ Medium import link) for backlinks
    try {
      const { syndicatePost, formatSyndicationTelegramMessage, getEnabledSyndicationPlatforms } =
        await import("@/lib/syndication");
      const enabledPlatforms = getEnabledSyndicationPlatforms();
      // Only bother if at least one platform beyond medium (which is always on) is configured
      if (enabledPlatforms.length > 1) {
        const coverImageUrl = coverImage?.startsWith("http")
          ? coverImage
          : coverImage
          ? `https://www.r2ftrading.com${coverImage}`
          : undefined;

        const tags = article.category
          ? [article.category, "trading", "forex", "ict"]
          : ["trading", "forex", "ict"];

        const syndicationResult = await syndicatePost({
          slug,
          title: article.title,
          excerpt: article.excerpt,
          bodyMarkdown: body,
          coverImageUrl,
          tags,
        });
        console.log("[cron] Syndication result:", JSON.stringify(syndicationResult));

        // Telegram alert with all syndication results (including Medium import URL)
        const tgToken = process.env.TELEGRAM_BOT_TOKEN;
        const tgChat = process.env.TELEGRAM_OWNER_CHAT_ID;
        if (tgToken && tgChat) {
          await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: tgChat,
              text: formatSyndicationTelegramMessage(syndicationResult),
              disable_web_page_preview: true,
            }),
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("[cron] Syndication error:", err);
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
              content: `You are a content strategist for R2F Trading (r2ftrading.com), an ICT trading coaching business — a dedicated ICT coaching brand.

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
