import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

interface ReplySuggestion {
  id: string;
  platform: string;
  postTitle: string;
  postUrl: string;
  authorName: string;
  suggestedReply: string;
  createdAt: string;
  status: "pending" | "used" | "skipped";
}

interface ForumPost {
  title: string;
  url: string;
  author: string;
  platform: "quora" | "tradingview" | "forexfactory" | "babypips";
}

const GOOGLE_SEARCH_QUERIES: Record<string, string> = {
  quora:
    'site:quora.com "ICT trading" OR "order blocks" OR "prop firm" OR "smart money concepts" OR "funded account"',
  tradingview:
    'site:tradingview.com/chart "ICT" OR "order blocks" OR "smart money" OR "fair value gap"',
  forexfactory:
    'site:forexfactory.com "ICT" OR "order blocks" OR "smart money" OR "liquidity sweep"',
  babypips:
    'site:forums.babypips.com "ICT" OR "order blocks" OR "smart money concepts" OR "prop firm"',
};

const QUORA_FALLBACK_QUESTIONS: ForumPost[] = [
  {
    title: "How do I start trading forex with ICT concepts?",
    url: "https://www.quora.com/How-do-I-start-trading-forex-with-ICT-concepts",
    author: "Quora User",
    platform: "quora",
  },
  {
    title: "What are order blocks in trading?",
    url: "https://www.quora.com/What-are-order-blocks-in-trading",
    author: "Quora User",
    platform: "quora",
  },
  {
    title: "Is ICT trading profitable?",
    url: "https://www.quora.com/Is-ICT-trading-profitable",
    author: "Quora User",
    platform: "quora",
  },
  {
    title: "How long does it take to get funded?",
    url: "https://www.quora.com/How-long-does-it-take-to-get-a-funded-trading-account",
    author: "Quora User",
    platform: "quora",
  },
  {
    title: "What's the best prop firm for beginners?",
    url: "https://www.quora.com/Whats-the-best-prop-firm-for-beginners",
    author: "Quora User",
    platform: "quora",
  },
  {
    title: "How do you identify fair value gaps on a chart?",
    url: "https://www.quora.com/How-do-you-identify-fair-value-gaps-on-a-chart",
    author: "Quora User",
    platform: "quora",
  },
  {
    title: "What is smart money concept in forex?",
    url: "https://www.quora.com/What-is-smart-money-concept-in-forex",
    author: "Quora User",
    platform: "quora",
  },
  {
    title: "Can you pass FTMO with ICT strategy?",
    url: "https://www.quora.com/Can-you-pass-FTMO-with-ICT-strategy",
    author: "Quora User",
    platform: "quora",
  },
];

const OWN_USERNAMES = ["Road_2_Funded", "R2F-Trading", "road_2_funded", "r2f-trading"];

async function searchGoogleForPosts(
  query: string,
  platform: ForumPost["platform"]
): Promise<ForumPost[]> {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbs=qdr:w&num=10`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      console.log(`[forum-opps] Google search returned ${res.status} for ${platform}`);
      return [];
    }

    const html = await res.text();
    const posts: ForumPost[] = [];

    // Extract URLs and titles from Google search results HTML
    // Google wraps results in <a> tags with href containing the actual URL
    const resultPattern = /<a[^>]+href="\/url\?q=([^"&]+)[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g;
    let match;
    while ((match = resultPattern.exec(html)) !== null) {
      const rawUrl = decodeURIComponent(match[1]);
      const title = match[2].replace(/<[^>]+>/g, "").trim();
      if (title && rawUrl.includes(platform === "babypips" ? "forums.babypips.com" : platform === "forexfactory" ? "forexfactory.com" : platform === "tradingview" ? "tradingview.com" : "quora.com")) {
        posts.push({ title, url: rawUrl, author: "Community", platform });
      }
    }

    // Fallback: try simpler href pattern
    if (posts.length === 0) {
      const hrefPattern = /href="(https?:\/\/(?:www\.)?(?:quora\.com|tradingview\.com|forexfactory\.com|forums\.babypips\.com)[^"]*)"[^>]*>([^<]+)/gi;
      while ((match = hrefPattern.exec(html)) !== null) {
        const rawUrl = match[1];
        const title = match[2].trim();
        if (title.length > 10 && rawUrl.includes(".com")) {
          posts.push({ title, url: rawUrl, author: "Community", platform });
        }
      }
    }

    return posts.slice(0, 5);
  } catch (err) {
    console.error(`[forum-opps] Google search failed for ${platform}:`, err);
    return [];
  }
}

async function fetchBabyPipsTopics(): Promise<ForumPost[]> {
  try {
    // BabyPips uses Discourse, try their JSON API
    const res = await fetch("https://forums.babypips.com/latest.json", {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) {
      console.log(`[forum-opps] BabyPips API returned ${res.status}`);
      return [];
    }

    const data = await res.json();
    const topics = data?.topic_list?.topics || [];
    const users = data?.users || [];

    const userMap = new Map<number, string>();
    for (const u of users) {
      userMap.set(u.id, u.username || "Unknown");
    }

    const posts: ForumPost[] = [];
    for (const topic of topics) {
      const title: string = topic.title || "";
      const lowerTitle = title.toLowerCase();
      // Filter for trading-relevant topics
      if (
        lowerTitle.includes("ict") ||
        lowerTitle.includes("order block") ||
        lowerTitle.includes("smart money") ||
        lowerTitle.includes("prop firm") ||
        lowerTitle.includes("funded") ||
        lowerTitle.includes("fair value gap") ||
        lowerTitle.includes("liquidity") ||
        lowerTitle.includes("break of structure")
      ) {
        const author = userMap.get(topic.posters?.[0]?.user_id) || "Unknown";
        if (OWN_USERNAMES.some((u) => author.toLowerCase() === u.toLowerCase())) continue;
        posts.push({
          title,
          url: `https://forums.babypips.com/t/${topic.slug}/${topic.id}`,
          author,
          platform: "babypips",
        });
      }
    }

    return posts.slice(0, 5);
  } catch (err) {
    console.error("[forum-opps] BabyPips fetch failed:", err);
    return [];
  }
}

async function fetchTradingViewIdeas(): Promise<ForumPost[]> {
  try {
    // Try TradingView's public ideas search
    const res = await fetch(
      "https://www.tradingview.com/ideas/search/?sort=recent&q=ICT+order+blocks",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      }
    );

    if (!res.ok) {
      console.log(`[forum-opps] TradingView ideas returned ${res.status}`);
      return [];
    }

    const html = await res.text();
    const posts: ForumPost[] = [];

    // Parse idea cards from HTML
    const ideaPattern = /href="(\/chart\/[^"]+)"[^>]*>[\s\S]*?class="[^"]*title[^"]*"[^>]*>([^<]+)/g;
    let match;
    while ((match = ideaPattern.exec(html)) !== null) {
      const url = `https://www.tradingview.com${match[1]}`;
      const title = match[2].trim();
      posts.push({ title, url, author: "TradingView User", platform: "tradingview" });
    }

    // Fallback: extract any idea-like links
    if (posts.length === 0) {
      const linkPattern = /href="(\/chart\/[A-Za-z0-9_-]+\/)"[^>]*>/g;
      while ((match = linkPattern.exec(html)) !== null) {
        posts.push({
          title: "ICT Trading Idea",
          url: `https://www.tradingview.com${match[1]}`,
          author: "TradingView User",
          platform: "tradingview",
        });
      }
    }

    // Filter out own posts
    return posts
      .filter(
        (p) => !OWN_USERNAMES.some((u) => p.url.toLowerCase().includes(u.toLowerCase()))
      )
      .slice(0, 5);
  } catch (err) {
    console.error("[forum-opps] TradingView fetch failed:", err);
    return [];
  }
}

async function fetchForexFactoryThreads(): Promise<ForumPost[]> {
  try {
    // Try Forex Factory RSS feed
    const res = await fetch("https://www.forexfactory.com/feed.php", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    if (!res.ok) {
      console.log(`[forum-opps] ForexFactory RSS returned ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const posts: ForumPost[] = [];

    // Parse RSS items
    const itemPattern = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?(?:<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>)?[\s\S]*?<\/item>/g;
    let match;
    while ((match = itemPattern.exec(xml)) !== null) {
      const title = match[1]?.trim() || "";
      const url = match[2]?.trim() || "";
      const author = match[3]?.trim() || "Forum Member";

      const lowerTitle = title.toLowerCase();
      if (
        lowerTitle.includes("ict") ||
        lowerTitle.includes("order block") ||
        lowerTitle.includes("smart money") ||
        lowerTitle.includes("liquidity") ||
        lowerTitle.includes("fair value") ||
        lowerTitle.includes("prop firm") ||
        lowerTitle.includes("funded")
      ) {
        if (OWN_USERNAMES.some((u) => author.toLowerCase() === u.toLowerCase())) continue;
        posts.push({ title, url, author, platform: "forexfactory" });
      }
    }

    // Fallback: simpler title/link extraction
    if (posts.length === 0) {
      const simplePattern = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>[\s\S]*?<link>(.*?)<\/link>/g;
      while ((match = simplePattern.exec(xml)) !== null) {
        const title = match[1]?.trim() || "";
        const url = match[2]?.trim() || "";
        if (title && url && url.includes("forexfactory.com")) {
          posts.push({ title, url, author: "Forum Member", platform: "forexfactory" });
        }
      }
    }

    return posts.slice(0, 5);
  } catch (err) {
    console.error("[forum-opps] ForexFactory fetch failed:", err);
    return [];
  }
}

async function generateForumReply(
  title: string,
  author: string,
  platform: ForumPost["platform"],
  anthropic: Anthropic
): Promise<string> {
  const platformContext: Record<string, string> = {
    quora:
      "Write an answer to this Quora question. Be authoritative and helpful. Answer the question directly with practical trading insight.",
    tradingview:
      "Write a comment on this TradingView idea/analysis. Engage with the analysis and add your perspective as an experienced ICT trader.",
    forexfactory:
      "Write a forum reply to this Forex Factory thread. Be conversational but knowledgeable. Add value to the discussion with a specific insight or tip.",
    babypips:
      "Write a helpful forum reply to this BabyPips thread. Be encouraging but speak from experience. Share a practical tip or perspective.",
  };

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `You are Harvest, an experienced ICT trader who also coaches students. Write a ${platform} reply (2-4 sentences) for this post.

${platformContext[platform]}

Post title: "${title}"
Author: "${author}"
Platform: ${platform}

RULES:
- Praise the poster genuinely. Acknowledge something specific about their question or analysis.
- Add a quick piece of value, a complementary tip or perspective that builds on the topic.
- Sound like a confident, knowledgeable trader. NOT someone who is struggling.
- You are an educator, not a student. Speak from a position of experience.
- Occasionally (not always) reference "my students" naturally, e.g. "this is exactly what i tell my students" or "my students always ask about this". This makes people curious to check your profile.
- NEVER use dashes of any kind. Use periods or commas instead.
- NEVER mention R2F Trading, your website, or anything directly promotional.
- NEVER use hashtags.
- Keep it under 400 characters.
- Sound natural. No generic openers like "Great question!" or "Great post!"

Write ONLY the reply text, nothing else.`,
      },
    ],
  });
  const block = msg.content[0];
  return block.type === "text" ? block.text.trim() : "";
}

async function loadExistingSuggestions(): Promise<ReplySuggestion[]> {
  try {
    const raw = await readFile("data/reply-suggestions.json");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const platformResults: Record<string, { found: number; error?: string }> = {};

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const existing = await loadExistingSuggestions();
    const existingUrls = new Set(existing.map((s) => s.postUrl));
    const newSuggestions: ReplySuggestion[] = [];

    // ─── 1. QUORA ───────────────────────────────────────────────
    try {
      console.log("[forum-opps] Searching Quora...");
      let quoraPosts = await searchGoogleForPosts(GOOGLE_SEARCH_QUERIES.quora, "quora");

      // Fallback to hardcoded questions if Google search fails
      if (quoraPosts.length === 0) {
        console.log("[forum-opps] Using Quora fallback questions");
        quoraPosts = QUORA_FALLBACK_QUESTIONS.filter((q) => !existingUrls.has(q.url));
      }

      let quoraCount = 0;
      for (const post of quoraPosts) {
        if (existingUrls.has(post.url)) continue;
        if (quoraCount >= 5) break;
        try {
          const reply = await generateForumReply(post.title, post.author, "quora", anthropic);
          if (reply) {
            newSuggestions.push({
              id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              platform: "quora",
              postTitle: post.title,
              postUrl: post.url,
              authorName: post.author,
              suggestedReply: reply,
              createdAt: new Date().toISOString(),
              status: "pending",
            });
            existingUrls.add(post.url);
            quoraCount++;
          }
        } catch {
          // Skip this post if reply generation fails
        }
      }
      platformResults.quora = { found: quoraCount };
    } catch (err) {
      console.error("[forum-opps] Quora pipeline failed:", err);
      platformResults.quora = { found: 0, error: err instanceof Error ? err.message : "Unknown error" };
    }

    // ─── 2. TRADINGVIEW ─────────────────────────────────────────
    try {
      console.log("[forum-opps] Searching TradingView...");
      let tvPosts = await fetchTradingViewIdeas();

      // Fallback to Google search
      if (tvPosts.length === 0) {
        console.log("[forum-opps] TradingView direct fetch failed, trying Google...");
        tvPosts = await searchGoogleForPosts(GOOGLE_SEARCH_QUERIES.tradingview, "tradingview");
      }

      let tvCount = 0;
      for (const post of tvPosts) {
        if (existingUrls.has(post.url)) continue;
        if (tvCount >= 5) break;
        try {
          const reply = await generateForumReply(post.title, post.author, "tradingview", anthropic);
          if (reply) {
            newSuggestions.push({
              id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              platform: "tradingview",
              postTitle: post.title,
              postUrl: post.url,
              authorName: post.author,
              suggestedReply: reply,
              createdAt: new Date().toISOString(),
              status: "pending",
            });
            existingUrls.add(post.url);
            tvCount++;
          }
        } catch {
          // Skip
        }
      }
      platformResults.tradingview = { found: tvCount };
    } catch (err) {
      console.error("[forum-opps] TradingView pipeline failed:", err);
      platformResults.tradingview = { found: 0, error: err instanceof Error ? err.message : "Unknown error" };
    }

    // ─── 3. FOREX FACTORY ───────────────────────────────────────
    try {
      console.log("[forum-opps] Searching Forex Factory...");
      let ffPosts = await fetchForexFactoryThreads();

      // Fallback to Google search
      if (ffPosts.length === 0) {
        console.log("[forum-opps] ForexFactory RSS failed, trying Google...");
        ffPosts = await searchGoogleForPosts(GOOGLE_SEARCH_QUERIES.forexfactory, "forexfactory");
      }

      let ffCount = 0;
      for (const post of ffPosts) {
        if (existingUrls.has(post.url)) continue;
        if (ffCount >= 5) break;
        try {
          const reply = await generateForumReply(post.title, post.author, "forexfactory", anthropic);
          if (reply) {
            newSuggestions.push({
              id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              platform: "forexfactory",
              postTitle: post.title,
              postUrl: post.url,
              authorName: post.author,
              suggestedReply: reply,
              createdAt: new Date().toISOString(),
              status: "pending",
            });
            existingUrls.add(post.url);
            ffCount++;
          }
        } catch {
          // Skip
        }
      }
      platformResults.forexfactory = { found: ffCount };
    } catch (err) {
      console.error("[forum-opps] ForexFactory pipeline failed:", err);
      platformResults.forexfactory = { found: 0, error: err instanceof Error ? err.message : "Unknown error" };
    }

    // ─── 4. BABYPIPS ────────────────────────────────────────────
    try {
      console.log("[forum-opps] Searching BabyPips...");
      let bpPosts = await fetchBabyPipsTopics();

      // Fallback to Google search
      if (bpPosts.length === 0) {
        console.log("[forum-opps] BabyPips API failed, trying Google...");
        bpPosts = await searchGoogleForPosts(GOOGLE_SEARCH_QUERIES.babypips, "babypips");
      }

      let bpCount = 0;
      for (const post of bpPosts) {
        if (existingUrls.has(post.url)) continue;
        if (bpCount >= 5) break;
        try {
          const reply = await generateForumReply(post.title, post.author, "babypips", anthropic);
          if (reply) {
            newSuggestions.push({
              id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              platform: "babypips",
              postTitle: post.title,
              postUrl: post.url,
              authorName: post.author,
              suggestedReply: reply,
              createdAt: new Date().toISOString(),
              status: "pending",
            });
            existingUrls.add(post.url);
            bpCount++;
          }
        } catch {
          // Skip
        }
      }
      platformResults.babypips = { found: bpCount };
    } catch (err) {
      console.error("[forum-opps] BabyPips pipeline failed:", err);
      platformResults.babypips = { found: 0, error: err instanceof Error ? err.message : "Unknown error" };
    }

    // ─── SAVE & NOTIFY ─────────────────────────────────────────
    if (newSuggestions.length > 0) {
      const allSuggestions = [...newSuggestions, ...existing];
      await commitFile(
        "data/reply-suggestions.json",
        JSON.stringify(allSuggestions, null, 2),
        `Added ${newSuggestions.length} forum reply suggestions`
      );
    }

    // Telegram notification
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
    if (tgToken && chatId && newSuggestions.length > 0) {
      const breakdown = Object.entries(platformResults)
        .map(([p, r]) => `${p}: ${r.found}${r.error ? " (error)" : ""}`)
        .join(", ");
      const message = `Found ${newSuggestions.length} forum reply suggestion${newSuggestions.length === 1 ? "" : "s"}!\n\n${breakdown}\n\nCheck: r2ftrading.com/admin/reply-suggestions`;
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      newCount: newSuggestions.length,
      platforms: platformResults,
      suggestions: newSuggestions.map((s) => ({
        id: s.id,
        platform: s.platform,
        title: s.postTitle,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
