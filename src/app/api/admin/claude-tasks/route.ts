import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile, listFiles } from "@/lib/github";
import { getAllPosts } from "@/lib/blog";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TASKS_PATH = "data/claude-tasks.json";

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

interface TasksData {
  tasks: ClaudeTask[];
  lastGeneratedAt: string;
  generationCount: number;
}

// Only regenerate twice per week (Mon and Thu at earliest)
function shouldRegenerate(lastGenerated: string): boolean {
  const last = new Date(lastGenerated);
  const now = new Date();
  const daysSince = (now.getTime() - last.getTime()) / 86400000;

  // At least 3 days between generations
  if (daysSince < 3) return false;

  // Only on Mon (1) or Thu (4) in Bangkok time
  const bangkokDay = parseInt(
    now.toLocaleDateString("en-US", { timeZone: "Asia/Bangkok", weekday: "narrow" })
      .replace("M", "1").replace("T", "4").replace("W", "3")
      .replace("F", "5").replace("S", "6")
  );
  // Simpler: just check if 3+ days have passed
  return daysSince >= 3;
}

async function gatherBusinessState() {
  // Subscribers
  let subscriberStats = { total: 0, hot: 0, warm: 0, cold: 0, avgScore: 0 };
  try {
    const raw = await readFile("data/subscribers.json");
    const subs: Record<string, unknown>[] = JSON.parse(raw);
    subscriberStats.total = subs.length;
    subscriberStats.hot = subs.filter(s => s.segment === "hot").length;
    subscriberStats.warm = subs.filter(s => s.segment === "warm").length;
    subscriberStats.cold = subs.filter(s => s.segment === "cold").length;
    const totalScore = subs.reduce((sum, s) => sum + ((s.score as number) || 0), 0);
    subscriberStats.avgScore = subs.length > 0 ? Math.round(totalScore / subs.length) : 0;
  } catch {}

  // Payments
  let paymentStats = { total: 0, revenue: 0, thisMonth: 0 };
  try {
    const raw = await readFile("data/payments.json");
    const payments: Record<string, unknown>[] = JSON.parse(raw);
    paymentStats.total = payments.length;
    const thisMonth = new Date().toISOString().slice(0, 7);
    paymentStats.thisMonth = payments.filter(p => (p.date as string)?.startsWith(thisMonth)).length;
    paymentStats.revenue = payments.reduce((sum, p) => sum + (parseFloat(String(p.amount).replace(/[^0-9.]/g, "")) || 0), 0);
  } catch {}

  // Blog posts
  const posts = getAllPosts();
  const blogCount = posts.length;
  const recentTopics = posts.slice(0, 10).map(p => p.title).join(", ");

  // Shorts
  let shortsStats = { total: 0, published: 0 };
  try {
    const files = await listFiles("data/shorts/renders");
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(file);
        const data = JSON.parse(raw);
        shortsStats.total++;
        if (data.status === "published") shortsStats.published++;
      } catch {}
    }
  } catch {}

  // Reddit engagement
  let redditStats = { totalComments: 0, withReplies: 0 };
  try {
    const raw = await readFile("data/reddit-engage-log.json");
    const log: Record<string, unknown>[] = JSON.parse(raw);
    redditStats.totalComments = log.length;
    redditStats.withReplies = log.filter(e => e.hasReply).length;
  } catch {}

  // Reply notifications
  let replyCount = 0;
  try {
    const raw = await readFile("data/reply-notifications.json");
    replyCount = JSON.parse(raw).length;
  } catch {}

  // Existing features (from admin sidebar sections)
  const existingFeatures = [
    "Blog generation (auto)", "YouTube shorts pipeline (auto)", "Social posting (10+ platforms, auto)",
    "Email drip sequences (cold/warm/hot, auto)", "Lead scoring", "Chatbot (website + WhatsApp + Telegram)",
    "Reddit commenting (auto)", "Forum reply suggestions", "Twitter engagement (auto)",
    "Review collection system", "Referral system", "PayPal payments",
    "$49 Starter Kit digital product", "Coaching plans ($150-$1000)",
    "Admin dashboard (20+ pages)", "Daily tasks checklist", "AI briefing",
    "WhatsApp automation", "Google Business Profile automation",
    "Newsletter (weekly, auto)", "Student onboarding emails (auto)",
    "Comment reply detection", "Exit-intent popup", "Crash course drip",
    "Content recycling", "Competitor watch", "SEO landing pages",
  ];

  return {
    subscriberStats,
    paymentStats,
    blogCount,
    recentTopics,
    shortsStats,
    redditStats,
    replyCount,
    existingFeatures,
  };
}

async function generateTasks(state: Awaited<ReturnType<typeof gatherBusinessState>>): Promise<ClaudeTask[]> {
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `You are evaluating the R2F Trading business (ICT trading coaching, run by Harvest in Bangkok) to suggest implementation tasks for Claude Code.

CURRENT BUSINESS STATE:
- Subscribers: ${state.subscriberStats.total} (${state.subscriberStats.hot} hot, ${state.subscriberStats.warm} warm, ${state.subscriberStats.cold} cold, avg score: ${state.subscriberStats.avgScore})
- Revenue: $${state.paymentStats.revenue} total, ${state.paymentStats.thisMonth} payments this month
- Blog posts: ${state.blogCount}
- Shorts: ${state.shortsStats.published} published of ${state.shortsStats.total} total
- Reddit: ${state.redditStats.totalComments} comments, ${state.redditStats.withReplies} got replies
- Comment replies detected: ${state.replyCount}

ALREADY BUILT (do NOT suggest these):
${state.existingFeatures.map(f => `- ${f}`).join("\n")}

BUSINESS CONTEXT:
- Solo operator, everything on Vercel + Supabase free/pro tiers
- All data stored via GitHub API (read-only filesystem on Vercel)
- PayPal only (no Stripe)
- Stack: Next.js, TypeScript, Tailwind, Resend for email
- Primary revenue: coaching ($150-$1000/week) and $49 starter kit

Generate exactly 6 implementation tasks that Claude Code could build to improve this business. Focus on:
1. The biggest current bottleneck (conversion, trust, retention, etc.)
2. Missing features that would meaningfully impact revenue or engagement
3. Automation opportunities for remaining manual work
4. Growth levers not yet utilized

For each task, assess:
- Priority (high/medium/low) based on expected business impact
- Category (conversion, engagement, content, revenue, analytics, operations)
- A clear 1-sentence title
- A 2-3 sentence description of what to build
- A 1-sentence reasoning for why this matters now

Return ONLY a JSON array of objects with fields: title, description, category, priority, reasoning
No other text.`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const parsed: { title: string; description: string; category: string; priority: string; reasoning: string }[] = JSON.parse(match[0]);
    return parsed.map((t, i) => ({
      id: `ct-${Date.now()}-${i}`,
      title: t.title,
      description: t.description,
      category: t.category || "operations",
      priority: (t.priority as "high" | "medium" | "low") || "medium",
      reasoning: t.reasoning,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

async function loadTasks(): Promise<TasksData> {
  try {
    return JSON.parse(await readFile(TASKS_PATH));
  } catch {
    return { tasks: [], lastGeneratedAt: "", generationCount: 0 };
  }
}

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const refresh = req.nextUrl.searchParams.get("refresh") === "true";

  try {
    let data = await loadTasks();
    const pendingTasks = data.tasks.filter(t => t.status === "pending");
    const needsGeneration = data.tasks.length === 0 || (pendingTasks.length === 0 && shouldRegenerate(data.lastGeneratedAt));

    if (refresh || needsGeneration) {
      const state = await gatherBusinessState();
      const newTasks = await generateTasks(state);

      if (newTasks.length > 0) {
        // Keep completed/dismissed tasks for history, replace pending ones
        const completedTasks = data.tasks.filter(t => t.status !== "pending");
        data = {
          tasks: [...newTasks, ...completedTasks.slice(0, 50)],
          lastGeneratedAt: new Date().toISOString(),
          generationCount: data.generationCount + 1,
        };

        await commitFile(
          TASKS_PATH,
          JSON.stringify(data, null, 2),
          `Claude tasks: generated ${newTasks.length} new suggestions`
        );
      }
    }

    const pending = data.tasks.filter(t => t.status === "pending");
    const completed = data.tasks.filter(t => t.status === "done");
    const dismissed = data.tasks.filter(t => t.status === "dismissed");

    return NextResponse.json({
      tasks: pending,
      completed: completed.slice(0, 20),
      dismissed: dismissed.slice(0, 10),
      lastGeneratedAt: data.lastGeneratedAt,
      generationCount: data.generationCount,
      stats: {
        pending: pending.length,
        completed: completed.length,
        dismissed: dismissed.length,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { taskId, action } = await req.json();
    if (!taskId || !action) return NextResponse.json({ error: "taskId and action required" }, { status: 400 });
    if (!["done", "dismissed"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const data = await loadTasks();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    task.status = action as "done" | "dismissed";
    task.completedAt = new Date().toISOString();

    await commitFile(
      TASKS_PATH,
      JSON.stringify(data, null, 2),
      `Claude task ${action}: ${task.title.slice(0, 50)}`
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
