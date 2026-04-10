"use client";

import { useEffect, useState } from "react";

interface CategoryCoverage {
  category: string;
  count: number;
  lastPosted: string | null;
  daysAgo: number;
}

interface ScheduleDay {
  date: string;
  dayName: string;
  planned: string[];
}

interface PlannerData {
  healthScore: number;
  categoryCoverage: CategoryCoverage[];
  suggestions: string[];
  upcomingEvents: string[];
  schedule: ScheduleDay[];
}

export default function ContentPlannerPage() {
  const [data, setData] = useState<PlannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/content-planner")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleQuickGenerate(category: string) {
    if (generating) return;
    setGenerating(category);
    try {
      const res = await fetch("/api/admin/batch-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 1, category }),
      });
      if (res.ok) {
        const result = await res.json();
        alert(
          result.generated > 0
            ? `Generated: ${result.results?.[0]?.title || category}`
            : "Generation failed. Check logs."
        );
      } else {
        alert("Failed to generate. Try again.");
      }
    } catch {
      alert("Network error.");
    }
    setGenerating(null);
  }

  function getHealthColor(score: number) {
    if (score >= 70) return "text-green-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  }

  function getHealthRingColor(score: number) {
    if (score >= 70) return "#4ade80";
    if (score >= 40) return "#facc15";
    return "#f87171";
  }

  function getBarColor(daysAgo: number) {
    if (daysAgo <= 3) return "bg-green-500";
    if (daysAgo <= 7) return "bg-yellow-500";
    return "bg-red-500";
  }

  function getBarLabel(daysAgo: number) {
    if (daysAgo <= 3) return "text-green-400";
    if (daysAgo <= 7) return "text-yellow-400";
    return "text-red-400";
  }

  if (loading) {
    return <div className="text-white/50 text-sm">Loading content planner...</div>;
  }

  if (!data) {
    return <div className="text-red-400 text-sm">Failed to load content data.</div>;
  }

  const maxCount = Math.max(...data.categoryCoverage.map((c) => c.count), 1);
  const circumference = 2 * Math.PI * 54;
  const healthOffset = circumference - (data.healthScore / 100) * circumference;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">AI Content Planner</h1>
      <p className="text-white/50 text-sm mb-8">
        Intelligent content strategy based on your posting history, category diversity, and market events.
      </p>

      {/* Health Score + Upcoming Events */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Health Score Ring */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 flex flex-col items-center justify-center">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-4">Content Health</p>
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="8"
              />
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke={getHealthRingColor(data.healthScore)}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={healthOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-black ${getHealthColor(data.healthScore)}`}>
                {data.healthScore}%
              </span>
            </div>
          </div>
          <p className="text-white/30 text-xs mt-3 text-center">
            {data.healthScore >= 70
              ? "Great diversity and consistency"
              : data.healthScore >= 40
              ? "Some categories need attention"
              : "Content gaps detected"}
          </p>
        </div>

        {/* Upcoming Market Events */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 md:col-span-2">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-4">Market Context</p>
          {data.upcomingEvents.length === 0 ? (
            <p className="text-white/30 text-sm">No notable events this week.</p>
          ) : (
            <div className="space-y-2">
              {data.upcomingEvents.map((event, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <span className="text-gold text-xs mt-0.5">
                    {event.includes("high") ? "!!!" : event.includes("medium") ? "!!" : "~"}
                  </span>
                  <p className="text-white/80 text-sm">{event}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Coverage */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider">
            Category Coverage (Last 14 Days)
          </p>
          <p className="text-white/20 text-[10px]">
            Green = posted in 3 days | Yellow = 4-7 days | Red = 8+ days
          </p>
        </div>
        <div className="space-y-4">
          {data.categoryCoverage.map((cat) => (
            <div key={cat.category} className="flex items-center gap-4">
              <div className="w-40 shrink-0">
                <p className="text-white/80 text-sm font-medium truncate">{cat.category}</p>
                <p className={`text-[10px] ${getBarLabel(cat.daysAgo)}`}>
                  {cat.daysAgo === 999
                    ? "Never posted"
                    : cat.daysAgo === 0
                    ? "Posted today"
                    : `${cat.daysAgo}d ago`}
                </p>
              </div>
              <div className="flex-1 bg-white/5 rounded-full h-5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${getBarColor(cat.daysAgo)} transition-all duration-700`}
                  style={{ width: `${Math.max((cat.count / maxCount) * 100, cat.count > 0 ? 8 : 0)}%` }}
                />
              </div>
              <span className="text-white/50 text-sm w-8 text-right font-mono">{cat.count}</span>
              {cat.daysAgo > 3 && (
                <button
                  onClick={() => handleQuickGenerate(cat.category)}
                  disabled={generating !== null}
                  className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded bg-gold/10 text-gold hover:bg-gold/20 transition-colors disabled:opacity-30 whitespace-nowrap"
                >
                  {generating === cat.category ? "Generating..." : "Quick Generate"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Smart Suggestions */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
        <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-4">
          AI Suggestions
        </p>
        {data.suggestions.length === 0 ? (
          <p className="text-white/30 text-sm">No suggestions at this time.</p>
        ) : (
          <div className="space-y-3">
            {data.suggestions.map((suggestion, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5"
              >
                <span className="text-gold text-sm mt-0.5 shrink-0">
                  {i === 0 ? "1." : i === 1 ? "2." : i === 2 ? "3." : i === 3 ? "4." : "5."}
                </span>
                <p className="text-white/70 text-sm leading-relaxed">{suggestion}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Schedule */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-4">
          7-Day Schedule
        </p>
        <div className="grid grid-cols-7 gap-2">
          {data.schedule.map((day, i) => {
            const isToday = i === 0;
            return (
              <div
                key={day.date}
                className={`rounded-lg p-3 border ${
                  isToday
                    ? "border-gold/30 bg-gold/5"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  isToday ? "text-gold" : "text-white/30"
                }`}>
                  {day.dayName}
                </p>
                <p className="text-white/50 text-[10px] mb-2">{day.date.slice(5)}</p>
                {day.planned.length === 0 ? (
                  <p className="text-white/15 text-[10px]">Nothing</p>
                ) : (
                  <div className="space-y-1">
                    {day.planned.map((item, j) => (
                      <p key={j} className="text-white/60 text-[10px] leading-tight truncate" title={item}>
                        {item.length > 30 ? item.slice(0, 28) + "..." : item}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
