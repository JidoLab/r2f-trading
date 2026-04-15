"use client";

import { useEffect, useState } from "react";

interface ClaudeTask {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  reasoning: string;
  status: "pending" | "done" | "dismissed";
  createdAt: string;
  completedAt?: string;
}

interface TasksResponse {
  tasks: ClaudeTask[];
  completed: ClaudeTask[];
  dismissed: ClaudeTask[];
  lastGeneratedAt: string;
  generationCount: number;
  stats: { pending: number; completed: number; dismissed: number };
}

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-blue-500/20 text-blue-400",
};

const CATEGORY_STYLES: Record<string, string> = {
  conversion: "bg-green-500/20 text-green-400",
  engagement: "bg-orange-500/20 text-orange-400",
  content: "bg-blue-500/20 text-blue-400",
  revenue: "bg-gold/20 text-gold",
  analytics: "bg-purple-500/20 text-purple-400",
  operations: "bg-teal-500/20 text-teal-400",
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      timeZone: "Asia/Bangkok",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export default function ClaudeTasksPage() {
  const [data, setData] = useState<TasksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  function fetchTasks(refresh = false) {
    const url = refresh ? "/api/admin/claude-tasks?refresh=true" : "/api/admin/claude-tasks";
    if (refresh) setRefreshing(true);
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); setRefreshing(false); })
      .catch(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { fetchTasks(); }, []);

  async function handleAction(taskId: string, action: "done" | "dismissed") {
    if (!data || acting) return;
    setActing(taskId);

    // Optimistic update
    const task = data.tasks.find(t => t.id === taskId);
    if (task) {
      const updated = { ...data };
      updated.tasks = updated.tasks.filter(t => t.id !== taskId);
      if (action === "done") {
        updated.completed = [{ ...task, status: "done", completedAt: new Date().toISOString() }, ...updated.completed];
        updated.stats = { ...updated.stats, pending: updated.stats.pending - 1, completed: updated.stats.completed + 1 };
      } else {
        updated.dismissed = [{ ...task, status: "dismissed", completedAt: new Date().toISOString() }, ...updated.dismissed];
        updated.stats = { ...updated.stats, pending: updated.stats.pending - 1, dismissed: updated.stats.dismissed + 1 };
      }
      setData(updated);
    }

    try {
      await fetch("/api/admin/claude-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action }),
      });
    } catch {
      // Revert would be complex, just refetch
      fetchTasks();
    }
    setActing(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white/40 text-sm">Evaluating business state...</div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Claude Code Backlog</h1>
          <p className="text-white/40 text-sm mt-1">
            AI-evaluated implementation suggestions based on your business metrics
          </p>
        </div>
        <button
          onClick={() => fetchTasks(true)}
          disabled={refreshing}
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm px-4 py-2 rounded-md transition-all disabled:opacity-40"
        >
          {refreshing ? "Evaluating..." : "Re-evaluate"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Pending</p>
          <p className="text-3xl font-black text-gold">{data.stats.pending}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Completed</p>
          <p className="text-3xl font-black text-green-400">{data.stats.completed}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Dismissed</p>
          <p className="text-3xl font-black text-white/30">{data.stats.dismissed}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Last Evaluated</p>
          <p className="text-lg font-bold text-white/60">
            {data.lastGeneratedAt ? relativeTime(data.lastGeneratedAt) : "never"}
          </p>
          <p className="text-white/30 text-xs mt-0.5">Refreshes when all tasks cleared</p>
        </div>
      </div>

      {/* Pending Tasks */}
      <div>
        <h2 className="text-white font-semibold text-sm mb-3">
          Suggested Implementations
          <span className="text-white/30 font-normal ml-2">({data.tasks.length})</span>
        </h2>
        {data.tasks.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
            <p className="text-white/40 text-sm mb-3">All tasks cleared! New suggestions will generate automatically.</p>
            <button
              onClick={() => fetchTasks(true)}
              disabled={refreshing}
              className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-2.5 rounded-md transition-all disabled:opacity-40"
            >
              {refreshing ? "Evaluating..." : "Generate New Suggestions"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.tasks.map(task => (
              <div
                key={task.id}
                className={`bg-white/[0.04] border border-white/10 rounded-lg p-5 transition-all ${
                  acting === task.id ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                      }`}>
                        {task.priority}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        CATEGORY_STYLES[task.category] || "bg-white/10 text-white/50"
                      }`}>
                        {task.category}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold text-sm mb-1">{task.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{task.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(task.id, "done")}
                      disabled={!!acting}
                      className="bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1.5 rounded-md transition-all"
                      title="Mark as implemented"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => handleAction(task.id, "dismissed")}
                      disabled={!!acting}
                      className="bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/50 text-xs font-bold px-3 py-1.5 rounded-md transition-all"
                      title="Dismiss this suggestion"
                    >
                      Skip
                    </button>
                  </div>
                </div>
                <div className="bg-white/[0.03] rounded-md px-3 py-2 mt-2">
                  <p className="text-white/30 text-xs italic">
                    <span className="text-white/40 font-medium not-italic">Why: </span>
                    {task.reasoning}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      {data.completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-white/40 hover:text-white/60 text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <span>{showCompleted ? "Hide" : "Show"} completed ({data.completed.length})</span>
            <span className="text-xs">{showCompleted ? "\u25B2" : "\u25BC"}</span>
          </button>
          {showCompleted && (
            <div className="space-y-2 mt-3">
              {data.completed.map(task => (
                <div key={task.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded border-2 bg-green-500 border-green-500 flex items-center justify-center shrink-0">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="#0a1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white/30 text-sm line-through">{task.title}</p>
                    </div>
                    {task.completedAt && (
                      <span className="text-white/20 text-xs shrink-0">{relativeTime(task.completedAt)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
