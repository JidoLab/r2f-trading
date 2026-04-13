"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardData {
  posts: { total: number; today: number; latest: { title: string; slug: string; date: string } | null };
  subscribers: { total: number; newToday: number; hot: number; warm: number };
  shorts: { ready: number; published: number; rendering: number };
  chatsToday: number;
  socialThisWeek: number;
  payments: { total: number; revenue: number; thisMonth: number; recent: { plan: string; amount: string; date: string }[] };
  latestPosts?: { title: string; slug: string; date: string }[];
  replySuggestionsPending?: number;
  redditCommentsToday?: number;
}

interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
}

interface BriefingData {
  overnight: {
    newSubscribers: number;
    payments: { count: number; revenue: number };
    chatConversations: number;
  };
  contentStatus: {
    blogPostsToday: number;
    socialPostsThisWeek: number;
  };
  suggestions: string[];
}

const EVENT_ICONS: Record<string, string> = {
  subscriber: "\u{1F4E7}",
  payment: "\u{1F4B0}",
  blog: "\u{1F4DD}",
  video: "\u{1F3AC}",
  chat: "\u{1F4AC}",
  review: "\u2B50",
  alert: "\u{1F534}",
  "hot-lead": "\u{1F525}",
};

function getGreeting(): string {
  const hour = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok", hour: "numeric", hour12: false }).replace(/\D/g, "");
  const h = parseInt(hour, 10);
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getBangkokTime(): string {
  return new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Cron schedule in Bangkok time for automation status
const AUTOMATIONS = [
  { label: "Blog #1", time: "13:00", hour: 13, minute: 0 },
  { label: "Blog #2", time: "23:00", hour: 23, minute: 0 },
  { label: "Short #1", time: "12:00", hour: 12, minute: 0 },
  { label: "Short #2", time: "18:00", hour: 18, minute: 0 },
  { label: "Short #3", time: "00:00", hour: 0, minute: 0 },
  { label: "Reddit #1", time: "10:00", hour: 10, minute: 0 },
  { label: "Reddit #2", time: "20:00", hour: 20, minute: 0 },
  { label: "Report", time: "21:00", hour: 21, minute: 0 },
];

function getNextRunLabel(auto: { label: string; time: string; hour: number; minute: number }): { label: string; timeStr: string; isPast: boolean } {
  const now = new Date();
  const bangkokNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const currentMinutes = bangkokNow.getHours() * 60 + bangkokNow.getMinutes();
  const targetMinutes = auto.hour * 60 + auto.minute;
  const isPast = currentMinutes >= targetMinutes;
  const h = auto.hour > 12 ? auto.hour - 12 : auto.hour === 0 ? 12 : auto.hour;
  const ampm = auto.hour >= 12 ? "PM" : "AM";
  return { label: auto.label, timeStr: `${h}${auto.minute > 0 ? ":" + String(auto.minute).padStart(2, "0") : ""}${ampm}`, isPast };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<"green" | "yellow" | "red">("green");
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [briefingSummary, setBriefingSummary] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);

  useEffect(() => {
    // Dashboard data
    fetch("/api/admin/dashboard")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    // Health
    fetch("/api/admin/health")
      .then(r => r.ok ? r.json() : { status: "red" })
      .then(d => setHealth(d.status || "green"))
      .catch(() => setHealth("red"));

    // Notifications
    fetch("/api/admin/notifications")
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => setEvents((d.events || []).slice(0, 8)))
      .catch(() => {});

    // Briefing with 5s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    fetch("/api/admin/briefing", { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then((d: BriefingData | null) => {
        clearTimeout(timeout);
        if (d) {
          const parts: string[] = [];
          if (d.contentStatus?.blogPostsToday > 0)
            parts.push(`${d.contentStatus.blogPostsToday} blog post${d.contentStatus.blogPostsToday > 1 ? "s" : ""} generated today`);
          if (d.overnight?.newSubscribers > 0)
            parts.push(`${d.overnight.newSubscribers} new subscriber${d.overnight.newSubscribers > 1 ? "s" : ""}`);
          if (d.overnight?.payments?.count > 0)
            parts.push(`${d.overnight.payments.count} payment${d.overnight.payments.count > 1 ? "s" : ""} ($${d.overnight.payments.revenue})`);
          if (d.overnight?.chatConversations > 0)
            parts.push(`${d.overnight.chatConversations} chat conversation${d.overnight.chatConversations > 1 ? "s" : ""}`);
          if (d.contentStatus?.socialPostsThisWeek > 0)
            parts.push(`${d.contentStatus.socialPostsThisWeek} social posts this week`);
          if (parts.length === 0) parts.push("All systems running smoothly. No major events overnight.");
          setBriefingSummary(parts.join(". ") + ".");
        }
        setBriefingLoading(false);
      })
      .catch(() => {
        clearTimeout(timeout);
        setBriefingLoading(false);
      });
  }, []);

  const bangkokTime = getBangkokTime();
  const greeting = getGreeting();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white/40 text-sm">Loading command center...</div>
      </div>
    );
  }

  const quickActions = [
    // Row 1: Content
    { icon: "\u{1F4DD}", label: "Generate Blog Post", href: "/admin/posts" },
    { icon: "\u{1F3AC}", label: "Shorts Pipeline", href: "/admin/shorts" },
    { icon: "\u{1F4E3}", label: "Quick Share", href: "/admin/share" },
    // Row 2: Engagement
    { icon: "\u{1F4AC}", label: "Reply Suggestions", href: "/admin/reply-suggestions", badge: data?.replySuggestionsPending },
    { icon: "\u{1F50D}", label: "Engagement Log", href: "/admin/engagement-log" },
    { icon: "\u2B50", label: "Reviews", href: "/admin/reviews" },
    // Row 3: Growth
    { icon: "\u{1F4CA}", label: "Lead Pipeline", href: "/admin/pipeline" },
    { icon: "\u{1F4B0}", label: "Revenue", href: "/admin/revenue" },
    { icon: "\u{1F9E0}", label: "AI Planner", href: "/admin/content-planner" },
  ];

  const automationStatus = AUTOMATIONS.map(a => getNextRunLabel(a));
  const latestPosts = data?.latestPosts || (data?.posts.latest ? [data.posts.latest] : []);

  return (
    <div className="space-y-6">
      {/* 1. Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block w-3 h-3 rounded-full shadow-lg ${
              health === "green" ? "bg-green-400 shadow-green-400/30" : health === "yellow" ? "bg-yellow-400 shadow-yellow-400/30" : "bg-red-400 shadow-red-400/30"
            }`}
            title={`System: ${health}`}
          />
          <div>
            <h1 className="text-2xl font-bold text-white">{greeting}, Harvest</h1>
            <p className="text-white/40 text-sm mt-0.5">{bangkokTime} (Bangkok)</p>
          </div>
        </div>
        <Link
          href="/admin/briefing"
          className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-5 py-2.5 rounded-md transition-all flex items-center gap-2"
        >
          <span>AI Briefing</span>
          <span className="text-xs">&rarr;</span>
        </Link>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Subscribers</p>
          <p className="text-3xl font-black text-gold">{data?.subscribers.total || 0}</p>
          {(data?.subscribers.newToday || 0) > 0 && (
            <p className="text-green-400 text-xs mt-1 font-medium">+{data?.subscribers.newToday} today</p>
          )}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Revenue</p>
          <p className="text-3xl font-black text-gold">${data?.payments.revenue?.toLocaleString() || "0"}</p>
          {(data?.payments.thisMonth || 0) > 0 && (
            <p className="text-green-400 text-xs mt-1 font-medium">{data?.payments.thisMonth} this month</p>
          )}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Blog Posts</p>
          <p className="text-3xl font-black text-white">{data?.posts.total || 0}</p>
          {(data?.posts.today || 0) > 0 && (
            <p className="text-green-400 text-xs mt-1 font-medium">+{data?.posts.today} today</p>
          )}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Shorts</p>
          <p className="text-3xl font-black text-white">{data?.shorts.published || 0}</p>
          {(data?.shorts.ready || 0) > 0 && (
            <p className="text-blue-400 text-xs mt-1 font-medium">{data?.shorts.ready} ready</p>
          )}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Hot Leads</p>
          <p className="text-3xl font-black text-red-400">{data?.subscribers.hot || 0}</p>
          {(data?.subscribers.warm || 0) > 0 && (
            <p className="text-yellow-400 text-xs mt-1 font-medium">{data?.subscribers.warm} warm</p>
          )}
        </div>
      </div>

      {/* 3. AI Quick Summary */}
      <div className="bg-white/[0.03] border border-white/10 rounded-lg p-5 border-l-4 border-l-gold/60">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider">AI Summary</h2>
          <Link href="/admin/briefing" className="text-gold text-xs font-medium hover:text-gold-light transition-colors">
            Full briefing &rarr;
          </Link>
        </div>
        {briefingLoading ? (
          <p className="text-white/30 text-sm">Loading briefing...</p>
        ) : briefingSummary ? (
          <p className="text-white/80 text-sm leading-relaxed">{briefingSummary}</p>
        ) : (
          <p className="text-white/40 text-sm">
            Could not load briefing.{" "}
            <Link href="/admin/briefing" className="text-gold hover:text-gold-light underline">
              View full briefing &rarr;
            </Link>
          </p>
        )}
      </div>

      {/* 4. Activity Feed + 5. Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Recent Activity</h2>
            <Link href="/admin/notifications" className="text-gold text-xs font-medium hover:text-gold-light transition-colors">
              View all &rarr;
            </Link>
          </div>
          {events.length === 0 ? (
            <p className="text-white/30 text-sm py-4">No recent events</p>
          ) : (
            <div className="space-y-1">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
                  <span className="text-base mt-0.5 shrink-0">{EVENT_ICONS[event.type] || "\u{1F4CB}"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-white/80 text-sm truncate">{event.description}</p>
                    <p className="text-white/30 text-xs mt-0.5">{relativeTime(event.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions Grid */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="bg-white/[0.03] border border-white/10 hover:border-gold/30 hover:bg-white/[0.06] rounded-lg p-4 text-center transition-all relative group"
              >
                <p className="text-xl mb-1.5">{action.icon}</p>
                <p className="text-white text-xs font-semibold leading-tight">{action.label}</p>
                {action.badge != null && action.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {action.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
          {/* Row labels */}
          <div className="grid grid-cols-3 gap-3 mt-2">
            <p className="text-white/20 text-[10px] uppercase tracking-wider text-center col-span-3 grid grid-cols-3">
              <span>Content</span>
              <span>Engagement</span>
              <span>Growth</span>
            </p>
          </div>
        </div>
      </div>

      {/* 6. Automation Status */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-5">
        <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">Automation Schedule</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {automationStatus.map((auto, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${auto.isPast ? "bg-white/20" : "bg-green-400 shadow-sm shadow-green-400/30"}`} />
              <span className="text-white/50 text-xs">{auto.label}:</span>
              <span className={`text-xs font-medium ${auto.isPast ? "text-white/25 line-through" : "text-white/80"}`}>{auto.timeStr}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Latest Content */}
      {latestPosts.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold text-sm mb-3">Latest Blog Posts</h2>
          <div className="space-y-3">
            {latestPosts.map((post, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-white/90 text-sm font-medium truncate">{post.title}</p>
                  <p className="text-white/30 text-xs mt-0.5">{post.date}</p>
                </div>
                <a
                  href={`/trading-insights/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold text-xs font-bold hover:text-gold-light transition-colors ml-4 shrink-0"
                >
                  View &nearr;
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
