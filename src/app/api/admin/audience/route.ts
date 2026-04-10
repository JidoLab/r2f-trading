import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, listFiles } from "@/lib/github";
import { getAnalyticsData, isAnalyticsConfigured } from "@/lib/analytics";

export const dynamic = "force-dynamic";

interface Subscriber {
  email: string;
  date: string;
  segment?: string;
  score?: number;
  dripsSent?: number;
  events?: { type: string; page?: string; date: string }[];
}

interface ChatMessage {
  role: string;
  content: string;
  timestamp: string;
}

interface ChatSession {
  messages: ChatMessage[];
  startedAt: string;
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Read subscribers
  let subscribers: Subscriber[] = [];
  try {
    const raw = await readFile("data/subscribers.json");
    subscribers = JSON.parse(raw);
  } catch {}

  // 2. Calculate subscriber growth (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const growthByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    growthByDay[d.toISOString().split("T")[0]] = 0;
  }
  for (const sub of subscribers) {
    const subDate = sub.date?.split("T")[0];
    if (subDate && subDate in growthByDay) {
      growthByDay[subDate]++;
    }
  }
  const subscriberGrowth = Object.entries(growthByDay).map(([date, count]) => ({
    date,
    count,
    label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  // 3. Lead score distribution
  let cold = 0;
  let warm = 0;
  let hot = 0;
  for (const sub of subscribers) {
    const seg = sub.segment?.toLowerCase();
    if (seg === "hot") hot++;
    else if (seg === "warm") warm++;
    else cold++;
  }
  const total = subscribers.length || 1;
  const scoreDistribution = {
    cold: { count: cold, pct: Math.round((cold / total) * 100) },
    warm: { count: warm, pct: Math.round((warm / total) * 100) },
    hot: { count: hot, pct: Math.round((hot / total) * 100) },
  };

  // 4. Engagement events
  const eventCounts: Record<string, number> = {
    email_signup: subscribers.length,
    blog_read: 0,
    coaching_page_view: 0,
    contact_page_view: 0,
    booking_click: 0,
  };

  // Read events-queue if it exists
  try {
    const raw = await readFile("data/events-queue.json");
    const events = JSON.parse(raw);
    if (Array.isArray(events)) {
      for (const ev of events) {
        const t = ev.type || ev.event;
        if (t && t in eventCounts) {
          eventCounts[t]++;
        }
      }
    }
  } catch {}

  // Also count from subscriber event arrays
  for (const sub of subscribers) {
    if (Array.isArray(sub.events)) {
      for (const ev of sub.events) {
        const t = ev.type;
        if (t && t in eventCounts) {
          eventCounts[t]++;
        } else if (t) {
          eventCounts[t] = (eventCounts[t] || 0) + 1;
        }
      }
    }
  }

  const engagementEvents = Object.entries(eventCounts)
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count);

  // 5. Top pages before conversion (from subscriber events)
  const pageBeforeConversion: Record<string, number> = {};
  for (const sub of subscribers) {
    if (Array.isArray(sub.events)) {
      for (const ev of sub.events) {
        if (ev.page) {
          pageBeforeConversion[ev.page] = (pageBeforeConversion[ev.page] || 0) + 1;
        }
      }
    }
  }
  const topPages = Object.entries(pageBeforeConversion)
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 6. Chatbot insights
  let totalConversations = 0;
  let totalMessages = 0;
  const firstQuestions: Record<string, number> = {};

  try {
    const files = await listFiles("data/chat-transcripts");
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    for (const file of jsonFiles) {
      try {
        const raw = await readFile(file);
        const data = JSON.parse(raw);

        for (const [, session] of Object.entries(data)) {
          const s = session as ChatSession;
          if (!s.messages || s.messages.length === 0) continue;
          totalConversations++;
          totalMessages += s.messages.length;

          const firstUser = s.messages.find((m) => m.role === "user");
          if (firstUser) {
            // Normalize first question to a short phrase
            const q = firstUser.content.slice(0, 60).toLowerCase().trim();
            firstQuestions[q] = (firstQuestions[q] || 0) + 1;
          }
        }
      } catch {}
    }
  } catch {}

  const avgMessages = totalConversations > 0 ? Math.round(totalMessages / totalConversations * 10) / 10 : 0;
  const topQuestions = Object.entries(firstQuestions)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const chatbotInsights = {
    totalConversations,
    avgMessages,
    topQuestions,
  };

  // 7. Subscriber timeline (full list with journey data)
  const subscriberTimeline = subscribers
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 100) // limit to last 100
    .map((sub) => ({
      email: sub.email,
      date: sub.date,
      segment: sub.segment || "cold",
      score: sub.score ?? 0,
      dripsSent: sub.dripsSent ?? 0,
      eventCount: Array.isArray(sub.events) ? sub.events.length : 0,
      events: (sub.events || []).slice(0, 10),
    }));

  // If GA4 is configured, include real traffic data
  let trafficData: {
    visitors7d: number;
    visitors30d: number;
    pageViews30d: number;
    bounceRate: number;
    topTrafficSources: { source: string; medium: string; sessions: number }[];
    dailyVisitors: { date: string; users: number }[];
  } | null = null;
  const analyticsConfigured = isAnalyticsConfigured();

  if (analyticsConfigured) {
    try {
      const analytics = await getAnalyticsData();
      if (analytics) {
        trafficData = {
          visitors7d: analytics.overview7d.users,
          visitors30d: analytics.overview30d.users,
          pageViews30d: analytics.overview30d.pageViews,
          bounceRate: analytics.overview30d.bounceRate,
          topTrafficSources: analytics.trafficSources.slice(0, 5).map((s) => ({
            source: s.source,
            medium: s.medium,
            sessions: s.sessions,
          })),
          dailyVisitors: analytics.dailyMetrics.map((d) => ({
            date: d.date,
            users: d.users,
          })),
        };
      }
    } catch {
      // analytics fetch failed — continue without it
    }
  }

  return NextResponse.json({
    subscriberGrowth,
    scoreDistribution,
    engagementEvents,
    topPages,
    chatbotInsights,
    subscriberTimeline,
    totalSubscribers: subscribers.length,
    analyticsConfigured,
    trafficData,
  });
}
