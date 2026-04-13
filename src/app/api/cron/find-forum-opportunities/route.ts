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
  platform: string;
}

const NON_ENGLISH = /[\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\u0400-\u04FF]/;
function isEnglish(text: string): boolean {
  if (NON_ENGLISH.test(text)) return false;
  const cleaned = text.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  return cleaned.length >= 5 && (cleaned.match(/[a-zA-Z]/g) || []).length > cleaned.length * 0.5;
}

// --- Reddit Public RSS (no auth needed) ---
const REDDIT_SUBS = ["Forex", "Daytrading", "FundedTrading", "ForexTrading", "proptrading", "algotrading", "StockMarket"];

async function searchRedditRSS(): Promise<ForumPost[]> {
  const posts: ForumPost[] = [];
  const shuffled = [...REDDIT_SUBS].sort(() => Math.random() - 0.5).slice(0, 4);

  for (const sub of shuffled) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/new.rss?limit=5`, {
        headers: { "User-Agent": "R2FTrading/1.0" },
      });
      if (!res.ok) continue;
      const xml = await res.text();

      // Parse Atom feed entries
      const entries = xml.split("<entry>").slice(1);
      for (const entry of entries.slice(0, 3)) {
        const titleM = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
        const linkM = entry.match(/<link[^>]*href="(https:\/\/www\.reddit\.com\/r\/[^"]+)"/);
        const authorM = entry.match(/<name>(.*?)<\/name>/);
        if (titleM && linkM) {
          const title = titleM[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
          if (!isEnglish(title)) continue;
          posts.push({ title, url: linkM[1], author: authorM?.[1] || "Reddit User", platform: "reddit_forum" });
        }
      }
    } catch {}
  }
  return posts.sort(() => Math.random() - 0.5).slice(0, 5);
}

// --- InvestingLive (ForexLive) RSS ---
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
        // Only keep trading-relevant articles
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

// --- Reply generation ---
async function generateReply(post: ForumPost, anthropic: Anthropic): Promise<string> {
  const labels: Record<string, string> = {
    reddit_forum: "Reddit post",
    investinglive: "InvestingLive article",
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

    // Load existing suggestions
    let existing: ReplySuggestion[] = [];
    try {
      existing = JSON.parse(await readFile("data/reply-suggestions.json"));
    } catch {}
    const existingUrls = new Set(existing.map(s => s.postUrl));

    const newSuggs: ReplySuggestion[] = [];

    // Search InvestingLive RSS only (Reddit is already fully automated via reddit-engage cron)
    const investingPosts = await searchInvestingLive();

    const allPosts = investingPosts.filter(p => !existingUrls.has(p.url));

    for (const post of allPosts.slice(0, 10)) {
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
        `Added ${newSuggs.length} forum suggestions (Reddit RSS, InvestingLive)`
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
      sources: { investinglive: investingPosts.length },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
