"use client";

import { useEffect, useState } from "react";

interface Task {
  id: string;
  title: string;
  category: string;
  estimatedMinutes: number;
  source: "recurring" | "ai";
  completed: boolean;
  completedAt: string | null;
}

interface DayEntry {
  date: string;
  tasks: Task[];
  completedCount: number;
  totalCount: number;
}

interface DailyTasksData {
  today: DayEntry;
  streak: number;
  todayPct: number;
  weekly: { date: string; day: string; pct: number }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  engagement: "bg-orange-500/20 text-orange-400",
  content: "bg-blue-500/20 text-blue-400",
  growth: "bg-green-500/20 text-green-400",
  revenue: "bg-yellow-500/20 text-yellow-400",
  overview: "bg-purple-500/20 text-purple-400",
};

function barColor(pct: number): string {
  if (pct >= 80) return "bg-gold";
  if (pct >= 50) return "bg-green-500";
  if (pct > 0) return "bg-yellow-500";
  return "bg-white/10";
}

export default function DailyTasksPage() {
  const [data, setData] = useState<DailyTasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/daily-tasks")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function toggleTask(taskId: string) {
    if (!data || toggling) return;
    setToggling(taskId);

    // Optimistic update
    const updated = { ...data };
    const task = updated.today.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      task.completedAt = task.completed ? new Date().toISOString() : null;
      updated.today.completedCount = updated.today.tasks.filter(t => t.completed).length;
      updated.todayPct = Math.round((updated.today.completedCount / updated.today.totalCount) * 100);
      if (updated.todayPct >= 50 && data.todayPct < 50) updated.streak++;
      if (updated.todayPct < 50 && data.todayPct >= 50) updated.streak = Math.max(0, updated.streak - 1);
      setData({ ...updated });
    }

    try {
      const res = await fetch("/api/admin/daily-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) {
        // Revert on failure
        if (task) {
          task.completed = !task.completed;
          task.completedAt = null;
          updated.today.completedCount = updated.today.tasks.filter(t => t.completed).length;
          updated.todayPct = Math.round((updated.today.completedCount / updated.today.totalCount) * 100);
          setData({ ...updated });
        }
      }
    } catch {
      // Revert silently
    }
    setToggling(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white/40 text-sm">Loading daily tasks...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-red-400 text-sm">Failed to load tasks</div>
      </div>
    );
  }

  const { today, streak, todayPct, weekly } = data;
  const circumference = 2 * Math.PI * 40;
  const strokeOffset = circumference - (todayPct / 100) * circumference;
  const ringColor = todayPct >= 80 ? "#d4af37" : todayPct >= 50 ? "#22c55e" : todayPct > 0 ? "#eab308" : "#ffffff1a";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Daily Tasks</h1>
        <p className="text-white/40 text-sm mt-1">Your daily checklist — AI-suggested + recurring manual tasks</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Progress Ring */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 flex items-center gap-5">
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={ringColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black text-white">{todayPct}%</span>
            </div>
          </div>
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Today</p>
            <p className="text-white text-lg font-bold">{today.completedCount} of {today.totalCount}</p>
            <p className="text-white/40 text-xs">tasks completed</p>
          </div>
        </div>

        {/* Streak */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 flex flex-col justify-center">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Streak</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gold">{streak}</span>
            <span className="text-white/50 text-sm">day{streak !== 1 ? "s" : ""}</span>
          </div>
          <p className="text-white/30 text-xs mt-1">
            {streak > 0 ? "Keep it going! Complete 50%+ to continue." : "Complete 50%+ of tasks to start a streak."}
          </p>
        </div>

        {/* Quick Summary */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 flex flex-col justify-center">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Estimated Time</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">
              {today.tasks.filter(t => !t.completed).reduce((sum, t) => sum + t.estimatedMinutes, 0)}
            </span>
            <span className="text-white/50 text-sm">min remaining</span>
          </div>
          <p className="text-white/30 text-xs mt-1">
            {today.tasks.filter(t => t.completed).reduce((sum, t) => sum + t.estimatedMinutes, 0)} min completed today
          </p>
        </div>
      </div>

      {/* Task Checklist */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-white font-semibold text-sm mb-4">Today&rsquo;s Checklist</h2>
        <div className="space-y-2">
          {today.tasks.map(task => (
            <button
              key={task.id}
              onClick={() => toggleTask(task.id)}
              disabled={toggling === task.id}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
                task.completed
                  ? "bg-white/[0.02] border-white/5"
                  : "bg-white/[0.04] border-white/10 hover:border-gold/30 hover:bg-white/[0.06]"
              } ${toggling === task.id ? "opacity-60" : ""}`}
            >
              {/* Checkbox */}
              <div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                task.completed
                  ? "bg-gold border-gold"
                  : "border-white/30"
              }`}>
                {task.completed && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="#0a1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium transition-all ${
                  task.completed ? "text-white/30 line-through" : "text-white/90"
                }`}>
                  {task.title}
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 shrink-0">
                {task.source === "ai" && (
                  <span className="text-[10px] font-bold bg-gold/20 text-gold px-1.5 py-0.5 rounded">AI</span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                  CATEGORY_COLORS[task.category] || "bg-white/10 text-white/50"
                }`}>
                  {task.category}
                </span>
                <span className="text-white/30 text-xs tabular-nums w-12 text-right">
                  {task.estimatedMinutes}m
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Consistency Chart */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-white font-semibold text-sm mb-4">Weekly Consistency</h2>
        <div className="flex items-end gap-3 h-40">
          {weekly.map(d => {
            const isToday = d.date === today.date;
            const displayPct = isToday ? todayPct : d.pct;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-white/50 text-xs mb-1 tabular-nums">
                  {displayPct > 0 ? `${displayPct}%` : ""}
                </span>
                <div
                  className={`w-full rounded-t-md transition-all ${barColor(displayPct)} ${isToday ? "ring-2 ring-gold/40" : ""}`}
                  style={{ height: `${Math.max(displayPct, 3)}%`, minHeight: "4px" }}
                />
                <span className={`text-[10px] mt-2 uppercase tracking-wider ${
                  isToday ? "text-gold font-bold" : "text-white/40"
                }`}>
                  {d.day}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 justify-center">
          <span className="flex items-center gap-1.5 text-[10px] text-white/30">
            <span className="w-2.5 h-2.5 rounded-sm bg-gold" /> 80%+
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-white/30">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> 50%+
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-white/30">
            <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" /> &lt;50%
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-white/30">
            <span className="w-2.5 h-2.5 rounded-sm bg-white/10" /> 0%
          </span>
        </div>
      </div>
    </div>
  );
}
