"use client";

import { useEffect, useState } from "react";

interface GrowthDay {
  date: string;
  count: number;
  label: string;
}

interface ScoreDistribution {
  cold: { count: number; pct: number };
  warm: { count: number; pct: number };
  hot: { count: number; pct: number };
}

interface EngagementEvent {
  event: string;
  count: number;
}

interface TopPage {
  page: string;
  count: number;
}

interface ChatbotInsights {
  totalConversations: number;
  avgMessages: number;
  topQuestions: { question: string; count: number }[];
}

interface SubscriberEntry {
  email: string;
  date: string;
  segment: string;
  score: number;
  dripsSent: number;
  eventCount: number;
  events: { type: string; page?: string; date: string }[];
}

interface AudienceData {
  subscriberGrowth: GrowthDay[];
  scoreDistribution: ScoreDistribution;
  engagementEvents: EngagementEvent[];
  topPages: TopPage[];
  chatbotInsights: ChatbotInsights;
  subscriberTimeline: SubscriberEntry[];
  totalSubscribers: number;
}

export default function AudiencePage() {
  const [data, setData] = useState<AudienceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/audience")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-white/50 text-sm">Loading audience data...</div>;
  }

  if (!data) {
    return <div className="text-red-400 text-sm">Failed to load audience data.</div>;
  }

  const maxGrowth = Math.max(...data.subscriberGrowth.map((d) => d.count), 1);
  const maxEvent = Math.max(...data.engagementEvents.map((e) => e.count), 1);
  const maxPage = data.topPages.length > 0 ? Math.max(...data.topPages.map((p) => p.count), 1) : 1;

  const segmentTotal =
    data.scoreDistribution.cold.count +
    data.scoreDistribution.warm.count +
    data.scoreDistribution.hot.count || 1;

  function formatEventName(name: string) {
    return name
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function segmentColor(seg: string) {
    if (seg === "hot") return "bg-red-500/10 text-red-400";
    if (seg === "warm") return "bg-yellow-500/10 text-yellow-400";
    return "bg-white/5 text-white/30";
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Audience Insights</h1>
      <p className="text-white/50 text-sm mb-2">
        Subscriber behavior, engagement patterns, and chatbot analysis.
      </p>
      <p className="text-white/30 text-xs mb-8">
        For full traffic analytics, visit{" "}
        <a
          href="https://vercel.com/wrightharvest-9811s-projects/r2f-trading/analytics"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold hover:text-gold-light underline"
        >
          Vercel Analytics
        </a>
      </p>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Total Subscribers</p>
          <p className="text-3xl font-black text-gold">{data.totalSubscribers}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Hot Leads</p>
          <p className="text-3xl font-black text-red-400">{data.scoreDistribution.hot.count}</p>
          <p className="text-white/30 text-xs mt-1">{data.scoreDistribution.hot.pct}% of total</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Conversations</p>
          <p className="text-3xl font-black text-white">{data.chatbotInsights.totalConversations}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Avg Messages</p>
          <p className="text-3xl font-black text-white">{data.chatbotInsights.avgMessages}</p>
          <p className="text-white/30 text-xs mt-1">per conversation</p>
        </div>
      </div>

      {/* Subscriber Growth + Lead Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Subscriber Growth Chart */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 md:col-span-2">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-4">
            Subscriber Growth (Last 30 Days)
          </p>
          <div className="flex items-end gap-[2px] h-32">
            {data.subscriberGrowth.map((day) => (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center justify-end group relative"
              >
                <div
                  className="w-full bg-gold/60 hover:bg-gold rounded-t transition-colors"
                  style={{
                    height: `${day.count > 0 ? Math.max((day.count / maxGrowth) * 100, 4) : 0}%`,
                    minHeight: day.count > 0 ? "4px" : "0",
                  }}
                />
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-navy border border-white/20 rounded px-2 py-1 text-[10px] text-white whitespace-nowrap z-10">
                  {day.label}: {day.count} signup{day.count !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-white/20 text-[10px]">{data.subscriberGrowth[0]?.label}</span>
            <span className="text-white/20 text-[10px]">
              {data.subscriberGrowth[data.subscriberGrowth.length - 1]?.label}
            </span>
          </div>
        </div>

        {/* Lead Score Distribution */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-4">
            Lead Score Distribution
          </p>
          {/* Simple stacked bar */}
          <div className="flex rounded-full overflow-hidden h-6 mb-4">
            {data.scoreDistribution.hot.count > 0 && (
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(data.scoreDistribution.hot.count / segmentTotal) * 100}%` }}
              />
            )}
            {data.scoreDistribution.warm.count > 0 && (
              <div
                className="bg-yellow-500 transition-all"
                style={{ width: `${(data.scoreDistribution.warm.count / segmentTotal) * 100}%` }}
              />
            )}
            {data.scoreDistribution.cold.count > 0 && (
              <div
                className="bg-white/20 transition-all"
                style={{ width: `${(data.scoreDistribution.cold.count / segmentTotal) * 100}%` }}
              />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-white/60 text-xs">Hot</span>
              </div>
              <span className="text-white/80 text-sm font-bold">
                {data.scoreDistribution.hot.count} ({data.scoreDistribution.hot.pct}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="text-white/60 text-xs">Warm</span>
              </div>
              <span className="text-white/80 text-sm font-bold">
                {data.scoreDistribution.warm.count} ({data.scoreDistribution.warm.pct}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="text-white/60 text-xs">Cold</span>
              </div>
              <span className="text-white/80 text-sm font-bold">
                {data.scoreDistribution.cold.count} ({data.scoreDistribution.cold.pct}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Heatmap + Top Pages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Engagement Events */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-4">
            Engagement Heatmap
          </p>
          <div className="space-y-3">
            {data.engagementEvents.map((ev) => (
              <div key={ev.event} className="flex items-center gap-3">
                <div className="w-36 shrink-0">
                  <p className="text-white/70 text-xs font-medium truncate">
                    {formatEventName(ev.event)}
                  </p>
                </div>
                <div className="flex-1 bg-white/5 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gold/70 transition-all duration-500"
                    style={{ width: `${Math.max((ev.count / maxEvent) * 100, 4)}%` }}
                  />
                </div>
                <span className="text-white/50 text-xs w-10 text-right font-mono">{ev.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pages Before Conversion */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-4">
            Top Pages Before Conversion
          </p>
          {data.topPages.length === 0 ? (
            <p className="text-white/30 text-sm">
              No page-level tracking data yet. Events will appear as subscribers interact with the site.
            </p>
          ) : (
            <div className="space-y-3">
              {data.topPages.map((page) => (
                <div key={page.page} className="flex items-center gap-3">
                  <div className="w-40 shrink-0">
                    <p className="text-white/70 text-xs font-mono truncate" title={page.page}>
                      {page.page}
                    </p>
                  </div>
                  <div className="flex-1 bg-white/5 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500/60 transition-all duration-500"
                      style={{ width: `${Math.max((page.count / maxPage) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="text-white/50 text-xs w-8 text-right font-mono">{page.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chatbot Insights */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
        <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-4">
          Chatbot Insights
        </p>
        {data.chatbotInsights.totalConversations === 0 ? (
          <p className="text-white/30 text-sm">No chatbot conversations recorded yet.</p>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 text-center">
                <p className="text-2xl font-black text-white">{data.chatbotInsights.totalConversations}</p>
                <p className="text-white/30 text-[10px] uppercase tracking-wider mt-1">Total Conversations</p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 text-center">
                <p className="text-2xl font-black text-white">{data.chatbotInsights.avgMessages}</p>
                <p className="text-white/30 text-[10px] uppercase tracking-wider mt-1">Avg Messages</p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 text-center">
                <p className="text-2xl font-black text-white">{data.chatbotInsights.topQuestions.length}</p>
                <p className="text-white/30 text-[10px] uppercase tracking-wider mt-1">Unique First Questions</p>
              </div>
            </div>
            {data.chatbotInsights.topQuestions.length > 0 && (
              <div>
                <p className="text-white/30 text-xs mb-3">Most Common First Questions</p>
                <div className="space-y-2">
                  {data.chatbotInsights.topQuestions.map((q, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5">
                      <span className="text-gold text-xs w-5 shrink-0">{i + 1}.</span>
                      <p className="text-white/60 text-xs flex-1 truncate">&ldquo;{q.question}&rdquo;</p>
                      <span className="text-white/30 text-xs font-mono">{q.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subscriber Timeline */}
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        <div className="p-6 pb-3">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider">
            Subscriber Timeline
          </p>
          <p className="text-white/20 text-[10px] mt-1">
            Showing last {data.subscriberTimeline.length} subscribers. Click to expand.
          </p>
        </div>
        {data.subscriberTimeline.length === 0 ? (
          <div className="p-6 pt-0">
            <p className="text-white/30 text-sm">No subscribers yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Signed Up</th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Segment</th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Drip</th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Events</th>
              </tr>
            </thead>
            <tbody>
              {data.subscriberTimeline.map((sub) => (
                <tr key={sub.email} className="border-b border-white/5 last:border-0">
                  <td className="px-6 py-0">
                    <button
                      onClick={() =>
                        setExpandedSub(expandedSub === sub.email ? null : sub.email)
                      }
                      className="w-full text-left py-3 hover:text-white transition-colors"
                    >
                      <span className="text-white/90 text-sm">{sub.email}</span>
                    </button>
                    {expandedSub === sub.email && sub.events.length > 0 && (
                      <div className="pb-3 pl-2">
                        <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Journey</p>
                        <div className="space-y-1">
                          {sub.events.map((ev, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px]">
                              <span className="text-white/20">{ev.date?.split("T")[0]}</span>
                              <span className="text-gold">{ev.type}</span>
                              {ev.page && <span className="text-white/30 font-mono">{ev.page}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 text-white/50 text-sm">
                    {sub.date ? new Date(sub.date).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${segmentColor(sub.segment)}`}
                    >
                      {sub.segment}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-white/50 text-sm">{sub.dripsSent}/4</td>
                  <td className="px-6 py-3 text-white/50 text-sm">{sub.eventCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
