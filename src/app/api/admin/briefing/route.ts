import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, listFiles, commitFile } from "@/lib/github";
import { getAllPosts } from "@/lib/blog";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_PATH = "data/briefing-cache.json";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface BriefingData {
  generatedAt: string;
  greeting: string;
  dateTime: string;
  overnight: {
    newSubscribers: number;
    payments: { count: number; revenue: number };
    chatConversations: number;
  };
  contentStatus: {
    blogPostsToday: number;
    totalBlogPosts: number;
    shortsReady: number;
    shortsPublished: number;
    shortsRendering: number;
    socialPostsThisWeek: number;
  };
  hotLeads: {
    count: number;
    recentHot: { email: string; score: number; lastActivity: string }[];
  };
  suggestions: string[];
  schedule: { time: string; task: string }[];
}

async function gatherData() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayISO = yesterday.toISOString();
  const todayDate = now.toISOString().split("T")[0];
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];

  // Subscribers
  let subscribers: Record<string, unknown>[] = [];
  let newSubscribers = 0;
  let hotLeadsList: { email: string; score: number; lastActivity: string }[] = [];
  try {
    const raw = await readFile("data/subscribers.json");
    subscribers = JSON.parse(raw);
    newSubscribers = subscribers.filter((s: Record<string, unknown>) =>
      (s.date as string) >= yesterdayISO
    ).length;
    hotLeadsList = subscribers
      .filter((s: Record<string, unknown>) => s.segment === "hot")
      .map((s: Record<string, unknown>) => ({
        email: s.email as string,
        score: (s.score as number) || 0,
        lastActivity: (s.lastActivity as string) || "",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  } catch {}

  // Payments
  let paymentCount = 0;
  let paymentRevenue = 0;
  try {
    const raw = await readFile("data/payments.json");
    const payments = JSON.parse(raw);
    const recentPayments = payments.filter(
      (p: Record<string, unknown>) => (p.date as string) >= yesterdayISO
    );
    paymentCount = recentPayments.length;
    for (const p of recentPayments) {
      paymentRevenue += parseFloat(String(p.amount).replace(/[^0-9.]/g, "")) || 0;
    }
  } catch {}

  // Chat conversations
  let chatConversations = 0;
  try {
    const raw = await readFile(`data/chat-transcripts/${todayDate}.json`);
    chatConversations = Object.keys(JSON.parse(raw)).length;
  } catch {}
  // Also check yesterday
  try {
    const yDate = yesterday.toISOString().split("T")[0];
    const raw = await readFile(`data/chat-transcripts/${yDate}.json`);
    chatConversations += Object.keys(JSON.parse(raw)).length;
  } catch {}

  // Blog posts
  const posts = getAllPosts();
  const blogPostsToday = posts.filter((p) => p.date >= todayDate).length;

  // Shorts
  let shortsReady = 0, shortsPublished = 0, shortsRendering = 0;
  try {
    const files = await listFiles("data/shorts/renders");
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(file);
        const data = JSON.parse(raw);
        if (data.status === "ready") shortsReady++;
        else if (data.status === "published") shortsPublished++;
        else if (data.status === "rendering") shortsRendering++;
      } catch {}
    }
  } catch {}

  // Social log
  let socialThisWeek = 0;
  try {
    const raw = await readFile("data/social-log.json");
    const log = JSON.parse(raw);
    socialThisWeek = log.filter((l: Record<string, unknown>) => (l.date as string) >= weekAgo).length;
  } catch {}

  // Reddit engage log
  let redditContext = "";
  try {
    const raw = await readFile("data/reddit-engage-log.json");
    const log = JSON.parse(raw);
    const recent = log.filter((l: Record<string, unknown>) => (l.date as string) >= yesterdayISO);
    const totalUpvotes = recent.reduce(
      (sum: number, l: Record<string, unknown>) => sum + ((l.upvotes as number) || 0),
      0
    );
    redditContext = `Reddit: ${recent.length} comments posted yesterday, ${totalUpvotes} total upvotes.`;
  } catch {}

  // Blog post dates for suggestion context
  const postDates: Record<string, string> = {};
  for (const p of posts.slice(0, 20)) {
    const category = (p as unknown as Record<string, unknown>).category as string || p.tags?.[0] || "general";
    if (!postDates[category]) {
      postDates[category] = p.date;
    }
  }

  // Subscriber engagement context for AI
  const subscriberContext = {
    total: subscribers.length,
    hot: subscribers.filter((s: Record<string, unknown>) => s.segment === "hot").length,
    warm: subscribers.filter((s: Record<string, unknown>) => s.segment === "warm").length,
    cold: subscribers.filter((s: Record<string, unknown>) => s.segment === "cold").length,
    avgDrips:
      subscribers.length > 0
        ? (
            subscribers.reduce((sum, s) => sum + ((s.dripsSent as number) || 0), 0) /
            subscribers.length
          ).toFixed(1)
        : "0",
  };

  // Events from hot leads
  let hotLeadActivity = "";
  for (const hl of hotLeadsList.slice(0, 3)) {
    const sub = subscribers.find((s: Record<string, unknown>) => s.email === hl.email);
    if (sub) {
      const events = (sub.events as { type: string; date: string }[]) || [];
      const recentEvents = events.filter((e) => e.date >= yesterdayISO);
      const coachingViews = recentEvents.filter((e) => e.type === "coaching_page_view").length;
      if (coachingViews > 0) {
        hotLeadActivity += `${hl.email} viewed coaching page ${coachingViews} time(s) recently. `;
      }
    }
  }

  return {
    newSubscribers,
    paymentCount,
    paymentRevenue,
    chatConversations,
    blogPostsToday,
    totalBlogPosts: posts.length,
    shortsReady,
    shortsPublished,
    shortsRendering,
    socialThisWeek,
    hotLeadsList,
    hotCount: hotLeadsList.length,
    subscriberContext,
    redditContext,
    hotLeadActivity,
    postDates,
  };
}

async function generateSuggestions(data: Awaited<ReturnType<typeof gatherData>>): Promise<string[]> {
  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `You are the AI assistant for R2F Trading, an ICT trading coaching business run by Harvest in Bangkok.

Based on this data, generate exactly 4 short, actionable smart suggestions (1 sentence each). Be specific with numbers and names where possible.

DATA:
- Subscribers: ${data.subscriberContext.total} total (${data.subscriberContext.hot} hot, ${data.subscriberContext.warm} warm, ${data.subscriberContext.cold} cold)
- Average drips per subscriber: ${data.subscriberContext.avgDrips}
- New subscribers yesterday: ${data.newSubscribers}
- Payments yesterday: ${data.paymentCount} ($${data.paymentRevenue})
- Chat conversations: ${data.chatConversations}
- Blog posts today: ${data.blogPostsToday} (${data.totalBlogPosts} total)
- Shorts: ${data.shortsReady} ready, ${data.shortsPublished} published, ${data.shortsRendering} rendering
- Social posts this week: ${data.socialThisWeek}
- ${data.redditContext || "No Reddit data available"}
- Hot lead activity: ${data.hotLeadActivity || "No recent hot lead activity"}

Return ONLY a JSON array of 4 strings, no other text. Example format:
["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4"]`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return [
      "Review your hot leads for manual outreach opportunities",
      "Check content calendar for upcoming gaps",
      "Monitor short video performance this week",
      "Consider a social media push on underperforming platforms",
    ];
  } catch {
    return [
      "AI suggestions unavailable — check ANTHROPIC_API_KEY",
      "Review hot leads manually",
      "Check content calendar for gaps",
      "Monitor short video performance",
    ];
  }
}

// Bangkok timezone cron schedule
const CRON_SCHEDULE = [
  { time: "09:00", task: "Generate 3 short videos" },
  { time: "11:00", task: "Text social post #1" },
  { time: "12:00", task: "Publish short #1" },
  { time: "13:00", task: "Blog post #1" },
  { time: "16:00", task: "Send drip emails" },
  { time: "18:00", task: "Publish short #2" },
  { time: "19:00", task: "Text social post #2" },
  { time: "21:00", task: "Daily report to Telegram" },
  { time: "23:00", task: "Blog post #2" },
  { time: "00:00", task: "Publish short #3" },
  { time: "10:00", task: "Reddit engage #1" },
  { time: "15:00", task: "Twitter engage" },
  { time: "20:00", task: "Reddit engage #2" },
  { time: "10:00 Mon", task: "Weekly newsletter" },
  { time: "14:00 Mon", task: "Weekly report" },
  { time: "13:00 Sun", task: "Pull analytics" },
  { time: "10:00", task: "Find reply opportunities" },
];

export async function GET(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bustCache = searchParams.get("refresh") === "1";

  // Check cache (skip if refresh requested)
  if (!bustCache) {
    try {
      const cacheRaw = await readFile(CACHE_PATH);
      const cached = JSON.parse(cacheRaw);
      const cacheAge = Date.now() - new Date(cached.generatedAt).getTime();
      if (cacheAge < CACHE_TTL) {
        return NextResponse.json(cached);
      }
    } catch {}
  }

  // Generate fresh briefing
  const data = await gatherData();
  const suggestions = await generateSuggestions(data);

  const now = new Date();
  const bangkokTime = now.toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const briefing: BriefingData = {
    generatedAt: now.toISOString(),
    greeting: "Good morning, Harvest",
    dateTime: bangkokTime + " (Bangkok)",
    overnight: {
      newSubscribers: data.newSubscribers,
      payments: { count: data.paymentCount, revenue: data.paymentRevenue },
      chatConversations: data.chatConversations,
    },
    contentStatus: {
      blogPostsToday: data.blogPostsToday,
      totalBlogPosts: data.totalBlogPosts,
      shortsReady: data.shortsReady,
      shortsPublished: data.shortsPublished,
      shortsRendering: data.shortsRendering,
      socialPostsThisWeek: data.socialThisWeek,
    },
    hotLeads: {
      count: data.hotCount,
      recentHot: data.hotLeadsList,
    },
    suggestions,
    schedule: CRON_SCHEDULE,
  };

  // Cache result
  try {
    await commitFile(CACHE_PATH, JSON.stringify(briefing, null, 2), "Update briefing cache");
  } catch {}

  return NextResponse.json(briefing);
}
