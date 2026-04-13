import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";
import { HttpsProxyAgent } from "https-proxy-agent";

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
  platform: string;
}

const NON_ENGLISH = /[\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\u0400-\u04FF]/;
function isEnglish(text: string): boolean {
  if (NON_ENGLISH.test(text)) return false;
  const cleaned = text.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  return cleaned.length >= 5 && (cleaned.match(/[a-zA-Z]/g) || []).length > cleaned.length * 0.5;
}

// --- Proxy fetch for Cloudflare-blocked sites ---
function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const user = process.env.PROXY_USERNAME;
  const pass = process.env.PROXY_PASSWORD;
  const host = process.env.PROXY_HOST || "gw.dataimpulse.com";
  const port = process.env.PROXY_PORT || "823";
  if (!user || !pass) return undefined;
  return new HttpsProxyAgent(`http://${user}:${pass}@${host}:${port}`);
}

async function proxyFetch(url: string): Promise<string | null> {
  const agent = getProxyAgent();
  if (!agent) return null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      // @ts-expect-error Node.js fetch supports agent
      agent,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// --- InvestingLive RSS (no proxy needed) ---
async function searchInvestingLive(): Promise<ForumPost[]> {
  const posts: ForumPost[] = [];
  try {
    const res = await fetch("https://investinglive.com/feed", {
      headers: { Accept: "application/xml, text/xml, */*" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.split("<item>").slice(1);
    for (const item of items.slice(0, 8)) {
      const titleM = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkM = item.match(/<link>(https?:.*?)<\/link>/);
      const creatorM = item.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/);
      if (titleM && linkM && isEnglish(titleM[1])) {
        const title = titleM[1];
        const lower = title.toLowerCase();
        if (lower.includes("forex") || lower.includes("trading") || lower.includes("market") ||
            lower.includes("gold") || lower.includes("usd") || lower.includes("eur") ||
            lower.includes("fed") || lower.includes("nfp") || lower.includes("cpi") ||
            lower.includes("stock") || lower.includes("crypto") || lower.includes("bitcoin")) {
          posts.push({ title, url: linkM[1], author: creatorM?.[1] || "InvestingLive", platform: "investinglive" });
        }
      }
    }
  } catch {}
  return posts.sort(() => Math.random() - 0.5).slice(0, 5);
}

// --- TradingView (proxy required) ---
async function searchTradingView(): Promise<ForumPost[]> {
  const posts: ForumPost[] = [];
  const html = await proxyFetch("https://www.tradingview.com/ideas/");
  if (!html) return [];

  // Extract idea titles and URLs from the HTML
  const ideaPattern = /href="(\/chart\/[^"]+|\/i\/[^"]+)"/g;
  const titlePattern = /<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)/g;

  // Simpler approach: find idea links with titles
  const blocks = html.split("data-widget-type").slice(1, 8);
  for (const block of blocks) {
    const linkM = block.match(/href="(\/chart\/[^"]+)"/);
    const titleM = block.match(/title="([^"]+)"/);
    if (linkM && titleM && isEnglish(titleM[1])) {
      posts.push({
        title: titleM[1].slice(0, 100),
        url: `https://www.tradingview.com${linkM[1]}`,
        author: "TradingView User",
        platform: "tradingview",
      });
    }
  }

  // Fallback: extract from meta/structured content
  if (posts.length === 0) {
    const matches = html.matchAll(/<a[^>]*href="(https:\/\/www\.tradingview\.com\/chart\/[^"]+)"[^>]*title="([^"]+)"/g);
    for (const m of matches) {
      if (isEnglish(m[2]) && posts.length < 5) {
        posts.push({ title: m[2].slice(0, 100), url: m[1], author: "TradingView User", platform: "tradingview" });
      }
    }
  }

  return posts.slice(0, 5);
}

// --- ForexFactory (proxy required) ---
async function searchForexFactory(): Promise<ForumPost[]> {
  const posts: ForumPost[] = [];
  const html = await proxyFetch("https://www.forexfactory.com/forums/trading-discussion");
  if (!html) return [];

  // Extract thread titles and URLs
  const threadPattern = /href="(\/thread\/[^"]+)"[^>]*class="[^"]*thread[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  let match;
  while ((match = threadPattern.exec(html)) !== null && posts.length < 8) {
    const url = `https://www.forexfactory.com${match[1]}`;
    const title = match[2].replace(/<[^>]+>/g, "").trim();
    if (title && isEnglish(title)) {
      posts.push({ title: title.slice(0, 100), url, author: "ForexFactory User", platform: "forexfactory" });
    }
  }

  // Fallback: simpler pattern
  if (posts.length === 0) {
    const simplePattern = /href="(\/thread\/\d+-[^"]+)"[^>]*>([^<]+)/g;
    while ((match = simplePattern.exec(html)) !== null && posts.length < 5) {
      const title = match[2].trim();
      if (title.length > 10 && isEnglish(title)) {
        posts.push({ title, url: `https://www.forexfactory.com${match[1]}`, author: "ForexFactory User", platform: "forexfactory" });
      }
    }
  }

  return posts.slice(0, 5);
}

// --- Quora via Google (proxy required) ---
async function searchQuora(): Promise<ForumPost[]> {
  const posts: ForumPost[] = [];
  const queries = [
    "site:quora.com forex trading funded account",
    "site:quora.com ICT trading order blocks",
    "site:quora.com prop firm challenge",
  ];
  const query = queries[Math.floor(Math.random() * queries.length)];
  const html = await proxyFetch(`https://www.google.com/search?q=${encodeURIComponent(query)}&num=5`);
  if (!html) return [];

  // Extract Quora links from Google results
  const linkPat = /href="\/url\?q=(https:\/\/www\.quora\.com\/[^&"]+)/g;
  let match;
  while ((match = linkPat.exec(html)) !== null && posts.length < 5) {
    const qUrl = decodeURIComponent(match[1]);
    const slug = qUrl.split("/").pop() || "";
    const title = slug.replace(/-/g, " ").replace(/\?.*/, "");
    if (title.length >= 10 && isEnglish(title)) {
      posts.push({ title, url: qUrl, author: "Quora", platform: "quora" });
    }
  }

  return posts;
}

// --- Reply generation ---
async function generateReply(post: ForumPost, anthropic: Anthropic): Promise<string> {
  const labels: Record<string, string> = {
    investinglive: "InvestingLive article",
    tradingview: "TradingView idea",
    forexfactory: "Forex Factory thread",
    quora: "Quora question",
  };
  const openers = [
    "Jump into a specific insight",
    "Ask a rhetorical question",
    "Share a personal take",
    "State a direct opinion",
    "Agree and extend",
    "Challenge a misconception",
  ];
  const opener = openers[Math.floor(Math.random() * openers.length)];

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `Write a comment in English (2-4 sentences) for this ${labels[post.platform] || "post"}.

Title: "${post.title}"
Author: "${post.author}"

STYLE: ${opener}
NEVER use dashes. No website mentions. No hashtags. No "Solid breakdown"/"Great content" openers. Under 400 chars. Occasionally say "my students". Vary structure. MUST be in English. Comment only.`,
    }],
  });
  return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const anthropic = new Anthropic();
    const hasProxy = !!(process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD);

    // Load existing suggestions
    let existing: ReplySuggestion[] = [];
    try {
      existing = JSON.parse(await readFile("data/reply-suggestions.json"));
    } catch {}
    const existingUrls = new Set(existing.map(s => s.postUrl));
    const newSuggs: ReplySuggestion[] = [];

    // Search all platforms in parallel
    const searches = [searchInvestingLive()];
    if (hasProxy) {
      searches.push(searchTradingView(), searchForexFactory(), searchQuora());
    }
    const results = await Promise.allSettled(searches);
    const allPosts: ForumPost[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") allPosts.push(...r.value);
    }

    const uniquePosts = allPosts.filter(p => !existingUrls.has(p.url));

    for (const post of uniquePosts.slice(0, 15)) {
      try {
        const reply = await generateReply(post, anthropic);
        if (reply) {
          newSuggs.push({
            id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            platform: post.platform,
            postTitle: post.title,
            postUrl: post.url,
            authorName: post.author,
            suggestedReply: reply,
            createdAt: new Date().toISOString(),
            status: "pending",
          });
          existingUrls.add(post.url);
        }
      } catch {}
    }

    if (newSuggs.length > 0) {
      const all = [...newSuggs, ...existing];
      await commitFile(
        "data/reply-suggestions.json",
        JSON.stringify(all, null, 2),
        `Added ${newSuggs.length} forum suggestions`
      );

      // Telegram notification
      try {
        const tgToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
        if (tgToken && chatId) {
          const breakdown = newSuggs.reduce((acc, s) => {
            acc[s.platform] = (acc[s.platform] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const summary = Object.entries(breakdown).map(([k, v]) => `${k}: ${v}`).join(", ");
          await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🎯 Found ${newSuggs.length} forum reply opportunities!\n${summary}\n\nCheck: r2ftrading.com/admin/reply-suggestions`,
            }),
          }).catch(() => {});
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      newCount: newSuggs.length,
      proxyEnabled: hasProxy,
      sources: allPosts.reduce((acc, p) => { acc[p.platform] = (acc[p.platform] || 0) + 1; return acc; }, {} as Record<string, number>),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
