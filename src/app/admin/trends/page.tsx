"use client";

import { useEffect, useState } from "react";

interface TrendsData {
  weeklyContext: string;
  events: { name: string; impact: string; tradingAngle: string }[];
  trending: string[];
  date: string;
}

export default function AdminTrendsPage() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/trends")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white/50 text-sm">Loading market trends...</div>;
  if (!data) return <div className="text-red-400 text-sm">Failed to load trends.</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Market Trends</h1>
      <p className="text-white/50 text-sm mb-8">
        Live market context feeding into blog + Shorts generation. Content is automatically trend-aware.
      </p>

      {/* Today's Context */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-3">Today&apos;s Market Context</h2>
        <p className="text-white/70 text-sm leading-relaxed">{data.weeklyContext}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Economic Events */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Upcoming Economic Events</h2>
          {data.events.length > 0 ? (
            <div className="space-y-3">
              {data.events.map((e, i) => (
                <div key={i} className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      e.impact === "high" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                    }`}>{e.impact}</span>
                    <h3 className="text-white text-sm font-semibold">{e.name}</h3>
                  </div>
                  <p className="text-white/40 text-xs mt-1">{e.tradingAngle}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-xs">No major events in the next 14 days.</p>
          )}
        </div>

        {/* Trending Topics */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Trending Topics (Google)</h2>
          {data.trending.length > 0 ? (
            <div className="space-y-2">
              {data.trending.map((t, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-md bg-white/[0.03]">
                  <span className="text-gold text-xs font-bold w-5">#{i + 1}</span>
                  <span className="text-white/80 text-xs">{t}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-xs">No trending data available.</p>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-white font-semibold text-sm mb-4">How Trends Feed Into Content</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "📰", title: "Blog Posts", desc: "Daily blog cron receives market context. Prioritizes timely topics (NFP, CPI, FOMC) for 3-5x search traffic boost." },
            { icon: "🎬", title: "YouTube Shorts", desc: "Video generation receives trending topics. Creates timely content that capitalizes on search spikes." },
            { icon: "📅", title: "Content Calendar", desc: "30-day calendar considers seasonal patterns and upcoming events for strategic topic planning." },
          ].map((item) => (
            <div key={item.title} className="text-center py-3">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-white text-xs font-semibold mb-1">{item.title}</p>
              <p className="text-white/30 text-[11px]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
