"use client";

import { useEffect, useState, useCallback } from "react";

interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  url?: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  subscriber: { icon: "\u{1F4E7}", color: "text-blue-400" },
  payment: { icon: "\u{1F4B0}", color: "text-green-400" },
  chat: { icon: "\u{1F4AC}", color: "text-cyan-400" },
  blog: { icon: "\u{1F4DD}", color: "text-purple-400" },
  video: { icon: "\u{1F3AC}", color: "text-pink-400" },
  review: { icon: "\u2B50", color: "text-yellow-400" },
  alert: { icon: "\u{1F534}", color: "text-red-400" },
  "hot-lead": { icon: "\u{1F525}", color: "text-orange-400" },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "subscribers", label: "Subscribers", types: ["subscriber", "hot-lead"] },
  { key: "payments", label: "Payments", types: ["payment"] },
  { key: "content", label: "Content", types: ["blog", "video", "chat"] },
  { key: "alerts", label: "Alerts", types: ["alert"] },
];

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const LAST_READ_KEY = "r2f_notifications_last_read";

export default function NotificationsPage() {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [lastRead, setLastRead] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem(LAST_READ_KEY) || "";
    setLastRead(stored);
  }, []);

  useEffect(() => {
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_READ_KEY, now);
    setLastRead(now);
    // Trigger storage event so sidebar badge updates immediately
    window.dispatchEvent(new StorageEvent("storage", { key: LAST_READ_KEY, newValue: now }));
  }, []);

  const isUnread = useCallback(
    (date: string) => {
      if (!lastRead) return true;
      return date > lastRead;
    },
    [lastRead]
  );

  const filtered = activeTab === "all"
    ? events
    : events.filter((e) => {
        const tab = FILTER_TABS.find((t) => t.key === activeTab);
        return tab?.types?.includes(e.type);
      });

  const unreadCount = events.filter((e) => isUnread(e.date)).length;

  const unreadCounts: Record<string, number> = {};
  for (const tab of FILTER_TABS) {
    if (tab.key === "all") {
      unreadCounts.all = unreadCount;
    } else {
      unreadCounts[tab.key] = events.filter(
        (e) => tab.types?.includes(e.type) && isUnread(e.date)
      ).length;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-white/40 hover:text-white px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>
      <p className="text-white/50 text-sm mb-8">
        System events from all automation sources.
        {unreadCount > 0 && (
          <span className="ml-2 text-gold font-semibold">{unreadCount} unread</span>
        )}
      </p>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? "bg-white/10 text-white border border-white/20"
                : "text-white/40 hover:text-white/70 border border-transparent hover:border-white/10"
            }`}
          >
            {tab.label}
            {unreadCounts[tab.key] > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-gold text-navy">
                {unreadCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Event Feed */}
      {loading ? (
        <p className="text-white/40">Loading notifications...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
          <p className="text-white/40 text-sm">No notifications in this category.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => {
            const config = TYPE_CONFIG[event.type] || { icon: "\u{1F514}", color: "text-white/50" };
            const unread = isUnread(event.date);
            const Wrapper = event.url ? "a" : "div";
            const wrapperProps = event.url
              ? { href: event.url, target: "_blank" as const, rel: "noopener noreferrer" }
              : {};
            return (
              <Wrapper
                key={event.id}
                {...wrapperProps}
                className={`bg-white/5 border rounded-lg p-4 flex items-start gap-3 transition-colors block ${
                  unread ? "border-gold/20 bg-gold/[0.03]" : "border-white/10"
                } ${event.url ? "hover:border-gold/40 hover:bg-white/[0.06] cursor-pointer" : ""}`}
              >
                <span className="text-xl mt-0.5 shrink-0" role="img" aria-label={event.type}>
                  {config.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-semibold ${unread ? "text-white" : "text-white/70"}`}>
                      {event.title}
                    </span>
                    {unread && (
                      <span className="w-2 h-2 rounded-full bg-gold shrink-0" />
                    )}
                    {event.url && (
                      <svg className="w-3 h-3 text-white/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    )}
                    <span className="text-white/30 text-xs ml-auto shrink-0">
                      {relativeTime(event.date)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${unread ? "text-white/60" : "text-white/40"}`}>
                    {event.description}
                  </p>
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}
