import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";

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

const RECURRING_TASKS: Omit<Task, "completed" | "completedAt">[] = [
  { id: "rec-1", title: "Review reply suggestions", category: "engagement", estimatedMinutes: 10, source: "recurring" },
  { id: "rec-2", title: "Check engagement log & respond", category: "engagement", estimatedMinutes: 10, source: "recurring" },
  { id: "rec-3", title: "Review AI briefing & act on insights", category: "overview", estimatedMinutes: 5, source: "recurring" },
];

const CATEGORY_KEYWORDS: [string, string[]][] = [
  ["content", ["blog", "post", "article", "write", "tradingview", "analysis", "video", "short", "content", "publish"]],
  ["engagement", ["reply", "comment", "reddit", "forum", "engage", "respond", "community", "telegram", "discord"]],
  ["growth", ["subscriber", "lead", "outreach", "seo", "traffic", "audience", "funnel"]],
  ["revenue", ["payment", "coaching", "convert", "upsell", "price", "sell", "revenue", "starter kit"]],
  ["overview", ["review", "check", "monitor", "briefing", "dashboard"]],
];

function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return "content";
}

function getBangkokDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

function getBangkokDayName(dateStr: string): string {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Bangkok" });
}

const HISTORY_PATH = "data/daily-tasks/history.json";

async function loadHistory(): Promise<DayEntry[]> {
  try {
    return JSON.parse(await readFile(HISTORY_PATH));
  } catch {
    return [];
  }
}

async function generateTodayTasks(): Promise<Task[]> {
  const tasks: Task[] = RECURRING_TASKS.map(t => ({ ...t, completed: false, completedAt: null }));

  // Pull AI suggestions from briefing cache
  try {
    const cache = JSON.parse(await readFile("data/briefing-cache.json"));
    const suggestions: string[] = cache?.suggestions || [];
    for (let i = 0; i < suggestions.length; i++) {
      tasks.push({
        id: `ai-${Date.now()}-${i}`,
        title: suggestions[i],
        category: inferCategory(suggestions[i]),
        estimatedMinutes: 15,
        source: "ai",
        completed: false,
        completedAt: null,
      });
    }
  } catch {
    // Briefing cache missing — add generic fallbacks
    const fallbacks = [
      "Do a TradingView chart analysis and quick-share it",
      "Review hot leads and consider personal outreach",
      "Check social media mentions and respond",
      "Review latest blog post performance",
    ];
    for (let i = 0; i < fallbacks.length; i++) {
      tasks.push({
        id: `fb-${Date.now()}-${i}`,
        title: fallbacks[i],
        category: inferCategory(fallbacks[i]),
        estimatedMinutes: 15,
        source: "ai",
        completed: false,
        completedAt: null,
      });
    }
  }

  return tasks;
}

function calculateStreak(history: DayEntry[], today: string): number {
  let streak = 0;
  const sorted = [...history].filter(h => h.date < today).sort((a, b) => b.date.localeCompare(a.date));

  // Check if yesterday was completed to start streak
  for (const entry of sorted) {
    const pct = entry.totalCount > 0 ? entry.completedCount / entry.totalCount : 0;
    if (pct >= 0.5) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getLast7Days(history: DayEntry[], today: string): { date: string; day: string; pct: number }[] {
  const days: { date: string; day: string; pct: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today + "T12:00:00Z");
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const entry = history.find(h => h.date === dateStr);
    const pct = entry && entry.totalCount > 0 ? Math.round((entry.completedCount / entry.totalCount) * 100) : 0;
    days.push({ date: dateStr, day: getBangkokDayName(dateStr), pct });
  }
  return days;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const countOnly = url.searchParams.get("countOnly") === "true";
    const today = getBangkokDate();
    const history = await loadHistory();
    let todayEntry = history.find(h => h.date === today);

    if (!todayEntry) {
      const tasks = await generateTodayTasks();
      todayEntry = { date: today, tasks, completedCount: 0, totalCount: tasks.length };
    }

    if (countOnly) {
      return NextResponse.json({
        completed: todayEntry.completedCount,
        total: todayEntry.totalCount,
      });
    }

    const streak = calculateStreak(history, today);
    const weekly = getLast7Days(history, today);
    const todayPct = todayEntry.totalCount > 0
      ? Math.round((todayEntry.completedCount / todayEntry.totalCount) * 100)
      : 0;

    // Include today in streak display if >50%
    const displayStreak = todayPct >= 50 ? streak + 1 : streak;

    return NextResponse.json({
      today: todayEntry,
      streak: displayStreak,
      todayPct,
      weekly,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { taskId } = await req.json();
    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

    const today = getBangkokDate();
    const history = await loadHistory();
    let todayIdx = history.findIndex(h => h.date === today);

    if (todayIdx < 0) {
      const tasks = await generateTodayTasks();
      history.unshift({ date: today, tasks, completedCount: 0, totalCount: tasks.length });
      todayIdx = 0;
    }

    const entry = history[todayIdx];
    const task = entry.tasks.find(t => t.id === taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    entry.completedCount = entry.tasks.filter(t => t.completed).length;

    // Keep last 90 days only
    const trimmed = history.slice(0, 90);

    await commitFile(
      HISTORY_PATH,
      JSON.stringify(trimmed, null, 2),
      `Daily tasks: ${entry.completedCount}/${entry.totalCount} completed`
    );

    return NextResponse.json({ success: true, today: entry });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
