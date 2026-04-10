"use client";

import { useEffect, useState } from "react";

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

export default function BriefingPage() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBriefing = (bustCache = false) => {
    const url = bustCache ? "/api/admin/briefing?refresh=1" : "/api/admin/briefing";
    setLoading(!bustCache);
    if (bustCache) setRefreshing(true);

    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Generating your morning briefing...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <p className="text-red-400 text-sm">Failed to load briefing.</p>;
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{data.greeting}</h1>
          <p className="text-white/40 text-sm mt-1">{data.dateTime}</p>
        </div>
        <button
          onClick={() => fetchBriefing(true)}
          disabled={refreshing}
          className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-5 py-2.5 rounded-md transition-all disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh Briefing"}
        </button>
      </div>

      {/* Overnight Summary */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          Overnight Summary
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 text-center">
            <p className="text-3xl font-black text-gold">{data.overnight.newSubscribers}</p>
            <p className="text-white/40 text-xs mt-1">New Subscribers</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 text-center">
            <p className="text-3xl font-black text-green-400">
              {data.overnight.payments.count > 0
                ? `$${data.overnight.payments.revenue.toLocaleString()}`
                : "$0"}
            </p>
            <p className="text-white/40 text-xs mt-1">
              {data.overnight.payments.count} Payment{data.overnight.payments.count !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 text-center">
            <p className="text-3xl font-black text-white">{data.overnight.chatConversations}</p>
            <p className="text-white/40 text-xs mt-1">Chat Conversations</p>
          </div>
        </div>
      </div>

      {/* Content Status */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          Content Status
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-white/60 text-sm">Blog posts generated today</span>
            <span className="text-white font-bold text-sm">{data.contentStatus.blogPostsToday} of {data.contentStatus.totalBlogPosts} total</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-white/60 text-sm">Shorts ready to publish</span>
            <span className="text-blue-400 font-bold text-sm">{data.contentStatus.shortsReady}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-white/60 text-sm">Shorts published</span>
            <span className="text-green-400 font-bold text-sm">{data.contentStatus.shortsPublished}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-white/60 text-sm">Shorts rendering</span>
            <span className="text-yellow-400 font-bold text-sm">{data.contentStatus.shortsRendering}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <span className="text-white/60 text-sm">Social posts this week</span>
            <span className="text-white font-bold text-sm">{data.contentStatus.socialPostsThisWeek}</span>
          </div>
        </div>
      </div>

      {/* Hot Leads Alert */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          Hot Leads Alert
        </h2>
        {data.hotLeads.count === 0 ? (
          <p className="text-white/30 text-sm">No hot leads at the moment.</p>
        ) : (
          <>
            <p className="text-white/50 text-sm mb-3">
              {data.hotLeads.count} subscriber{data.hotLeads.count !== 1 ? "s" : ""} in hot segment
            </p>
            <div className="space-y-2">
              {data.hotLeads.recentHot.map((lead) => (
                <div
                  key={lead.email}
                  className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-white/90 text-sm font-medium truncate">{lead.email}</p>
                    <p className="text-white/30 text-xs mt-0.5">
                      Last active: {lead.lastActivity ? new Date(lead.lastActivity).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <span className="text-red-400 font-bold text-sm">Score: {lead.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Smart Suggestions */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gold" />
          Smart Suggestions
        </h2>
        <div className="space-y-3">
          {data.suggestions.map((suggestion, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3"
            >
              <span className="text-gold font-bold text-sm mt-0.5">{i + 1}.</span>
              <p className="text-white/80 text-sm leading-relaxed">{suggestion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Today&apos;s Schedule (Bangkok Time)
        </h2>
        <div className="space-y-1">
          {data.schedule.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0"
            >
              <span className="text-gold font-mono text-xs w-20 shrink-0">{item.time}</span>
              <span className="text-white/70 text-sm">{item.task}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Generated timestamp */}
      <p className="text-white/20 text-xs mt-4 text-right">
        Generated: {new Date(data.generatedAt).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" })}
      </p>
    </div>
  );
}
