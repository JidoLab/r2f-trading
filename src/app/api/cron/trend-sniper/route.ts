import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile, listFiles } from "@/lib/github";
import { buildMarketContext } from "@/lib/market-trends";
import { sendTelegramReport } from "@/lib/telegram-report";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

const SNIPER_LOG_PATH = "data/trend-sniper-log.json";
const IDEAS_PATH = "data/content-ideas-from-comments.json";

const TRADING_KEYWORDS = [
  "forex", "trading", "stock", "bitcoin", "crypto", "fed",
  "interest rate", "inflation", "gdp", "employment", "gold", "oil",
  "market crash", "recession", "nasdaq", "s&p", "dow jones",
  "ethereum", "treasury", "bond", "commodity", "currency",
  "wall street", "federal reserve", "earnings",
];

interface SniperLogEntry {
  topic: string;
  matchedKeywords: string[];
  blogTopic: string;
  date: string;
  triggered: boolean;
}

interface ContentIdea {
  id: string;
  source: "competitor" | "reddit" | "trend";
  postTitle: string;
  ourComment: string;
  score: number;
  suggestedTopic: string;
  suggestedAngle: string;
  date: string;
  subreddit: string;
  permalink?: string;
  generated?: boolean;
}

async function loadSniperLog(): Promise<SniperLogEntry[]> {
  try {
    const raw = await readFile(SNIPER_LOG_PATH);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveSniperLog(log: SniperLogEntry[]): Promise<void> {
  await commitFile(
    SNIPER_LOG_PATH,
    JSON.stringify(log, null, 2),
    "Trend sniper: update log"
  );
}

async function loadIdeas(): Promise<ContentIdea[]> {
  try {
    const raw = await readFile(IDEAS_PATH);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveIdeas(ideas: ContentIdea[]): Promise<void> {
  await commitFile(
    IDEAS_PATH,
    JSON.stringify(ideas, null, 2),
    "Trend sniper: add content idea"
  );
}

async function getExistingSlugs(): Promise<string[]> {
  try {
    const files = await listFiles("content/blog", ".mdx");
    return files.map((f) =>
      f
        .replace(/^content\/blog\//, "")
        .replace(/\.mdx$/, "")
        .replace(/^\d{4}-\d{2}-\d{2}-/, "")
        .toLowerCase()
    );
  } catch {
    return [];
  }
}

async function fetchGoogleTrendsRSS(): Promise<string[]> {
  const topics: string[] = [];

  // General US trending
  try {
    const res = await fetch("https://trends.google.com/trending/rss?geo=US", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (res.ok) {
      const text = await res.text();
      const titles = text.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) || [];
      for (const match of titles) {
        const topic = match
          .replace(/<title><!\[CDATA\[/, "")
          .replace(/\]\]><\/title>/, "");
        if (topic && topic !== "Daily Search Trends" && !topics.includes(topic)) {
          topics.push(topic);
        }
      }
    }
  } catch {
    // Trends RSS may be unavailable
  }

  return topics;
}

function matchesTradingKeywords(topic: string): string[] {
  const lower = topic.toLowerCase();
  return TRADING_KEYWORDS.filter((kw) => lower.includes(kw));
}

function alreadyHasBlogPost(topic: string, existingSlugs: string[]): boolean {
  const topicWords = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return existingSlugs.some((slug) => {
    const slugWords = slug.split("-");
    const matchCount = topicWords.filter((w) => slugWords.includes(w)).length;
    return matchCount >= 2;
  });
}

function alreadySniperToday(log: SniperLogEntry[]): boolean {
  const today = new Date().toISOString().split("T")[0];
  return log.some((entry) => entry.date.startsWith(today) && entry.triggered);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sniperLog = await loadSniperLog();

    // Max 1 trend-based post per day
    if (alreadySniperToday(sniperLog)) {
      return NextResponse.json({
        success: true,
        message: "Already triggered a trend-based post today",
      });
    }

    // Fetch trending topics from Google Trends RSS
    const trendingTopics = await fetchGoogleTrendsRSS();

    // Also get market context for additional signals
    let marketContext = "";
    try {
      marketContext = await buildMarketContext();
    } catch {
      // Not critical
    }

    // Filter for trading-related topics
    const tradingTrends: { topic: string; keywords: string[] }[] = [];
    for (const topic of trendingTopics) {
      const matched = matchesTradingKeywords(topic);
      if (matched.length > 0) {
        tradingTrends.push({ topic, keywords: matched });
      }
    }

    if (tradingTrends.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No trading-related trends found today",
        totalTrends: trendingTopics.length,
      });
    }

    // Check if we already have blog posts covering these topics
    const existingSlugs = await getExistingSlugs();
    const uncoveredTrends = tradingTrends.filter(
      (t) => !alreadyHasBlogPost(t.topic, existingSlugs)
    );

    if (uncoveredTrends.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All trading trends already covered by existing posts",
        tradingTrends: tradingTrends.length,
      });
    }

    // Pick the best trending topic (most keyword matches)
    const bestTrend = uncoveredTrends.sort(
      (a, b) => b.keywords.length - a.keywords.length
    )[0];

    // Use Claude to generate a blog topic connecting the trend to ICT trading
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are a content strategist for R2F Trading, an ICT trading coaching brand.

A topic is currently trending on Google: "${bestTrend.topic}"
Matched trading keywords: ${bestTrend.keywords.join(", ")}

${marketContext ? `MARKET CONTEXT:\n${marketContext.slice(0, 1000)}` : ""}

Generate a blog topic that connects this trending topic to ICT trading concepts. The post should:
- Be timely and capitalize on search traffic
- Connect the trending event to ICT methodology (order blocks, FVGs, liquidity, etc.)
- Provide actionable trading insights

Return ONLY a JSON object:
{ "topic": "Blog title under 60 chars", "angle": "1-2 sentence description of the content angle", "targetKeyword": "primary SEO keyword" }`,
        },
      ],
    });

    let text =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";
    text = text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    const ideaData = JSON.parse(text);

    // Save as high-priority content idea
    const ideas = await loadIdeas();
    const idea: ContentIdea = {
      id: `trend-${Date.now()}`,
      source: "trend",
      postTitle: bestTrend.topic,
      ourComment: `Trending topic: ${bestTrend.keywords.join(", ")}`,
      score: 100, // High priority
      suggestedTopic: ideaData.topic,
      suggestedAngle: ideaData.angle,
      date: new Date().toISOString(),
      subreddit: "",
      permalink: `https://trends.google.com/trending?geo=US`,
    };
    await saveIdeas([idea, ...ideas]);

    // Log the sniper action
    const logEntry: SniperLogEntry = {
      topic: bestTrend.topic,
      matchedKeywords: bestTrend.keywords,
      blogTopic: ideaData.topic,
      date: new Date().toISOString(),
      triggered: true,
    };
    await saveSniperLog([logEntry, ...sniperLog]);

    // Send Telegram notification
    await sendTelegramReport(
      `🔥 *Trending*: ${bestTrend.topic}\n\nAuto-generating blog idea: ${ideaData.topic}\nAngle: ${ideaData.angle}\nKeyword: ${ideaData.targetKeyword}`
    );

    return NextResponse.json({
      success: true,
      trendingTopic: bestTrend.topic,
      matchedKeywords: bestTrend.keywords,
      blogTopic: ideaData.topic,
      angle: ideaData.angle,
    });
  } catch (err: unknown) {
    console.error("[trend-sniper] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
