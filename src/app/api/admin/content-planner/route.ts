import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, listFiles } from "@/lib/github";
import { getAllPosts } from "@/lib/blog";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CATEGORIES = [
  "ICT Concepts",
  "Trading Psychology",
  "Risk Management",
  "Funded Accounts",
  "Beginner Guides",
  "Market Analysis",
  "Personal Stories",
];

// Map common tags to our 7 canonical categories
function categorizePost(tags: string[]): string {
  const lower = tags.map((t) => t.toLowerCase());
  if (lower.some((t) => t.includes("ict") || t.includes("order block") || t.includes("fair value") || t.includes("killzone") || t.includes("smart money"))) return "ICT Concepts";
  if (lower.some((t) => t.includes("psychology") || t.includes("mindset") || t.includes("discipline") || t.includes("emotion") || t.includes("revenge"))) return "Trading Psychology";
  if (lower.some((t) => t.includes("risk") || t.includes("position size") || t.includes("drawdown") || t.includes("money management"))) return "Risk Management";
  if (lower.some((t) => t.includes("funded") || t.includes("ftmo") || t.includes("prop firm") || t.includes("challenge"))) return "Funded Accounts";
  if (lower.some((t) => t.includes("beginner") || t.includes("basics") || t.includes("getting started") || t.includes("newbie") || t.includes("how to start"))) return "Beginner Guides";
  if (lower.some((t) => t.includes("analysis") || t.includes("market") || t.includes("scalp") || t.includes("swing") || t.includes("strategy") || t.includes("setup"))) return "Market Analysis";
  if (lower.some((t) => t.includes("personal") || t.includes("story") || t.includes("journey") || t.includes("experience") || t.includes("my "))) return "Personal Stories";
  return "Market Analysis"; // default
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Read all blog posts
  const posts = getAllPosts();
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);

  // 2. Calculate category coverage
  const categoryCoverage = CATEGORIES.map((category) => {
    const categoryPosts = posts.filter((p) => categorizePost(p.tags) === category);
    const recentPosts = categoryPosts.filter((p) => new Date(p.date) >= fourteenDaysAgo);
    const lastPost = categoryPosts[0]; // posts are sorted newest first
    const lastPosted = lastPost ? lastPost.date : null;
    const daysAgo = lastPosted
      ? Math.floor((now.getTime() - new Date(lastPosted).getTime()) / 86400000)
      : 999;

    return {
      category,
      count: recentPosts.length,
      lastPosted,
      daysAgo,
    };
  });

  // 3. Calculate health score
  const coveredThisWeek = categoryCoverage.filter((c) => c.daysAgo <= 7).length;
  const topicDiversityScore = (coveredThisWeek / CATEGORIES.length) * 40; // 40 points max

  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const postsThisWeek = posts.filter((p) => new Date(p.date) >= sevenDaysAgo);
  const daysWithPosts = new Set(postsThisWeek.map((p) => p.date)).size;
  const consistencyScore = Math.min(daysWithPosts / 5, 1) * 30; // 30 points max (5 days target)

  const avgFreshness = categoryCoverage.reduce((sum, c) => sum + Math.min(c.daysAgo, 14), 0) / CATEGORIES.length;
  const freshnessScore = Math.max(0, (1 - avgFreshness / 14)) * 30; // 30 points max

  const healthScore = Math.round(topicDiversityScore + consistencyScore + freshnessScore);

  // 4. Read social engagement data
  let socialLog: { slug?: string; date?: string; platform?: string }[] = [];
  try {
    const raw = await readFile("data/social-log.json");
    socialLog = JSON.parse(raw);
  } catch {}

  // 5. Get upcoming market events
  let upcomingEvents: string[] = [];
  try {
    const { getUpcomingEvents, getWeeklyContext } = await import("@/lib/market-trends");
    const events = getUpcomingEvents(7);
    upcomingEvents = events.map((e) => `${e.name} (${e.impact} impact)`);
    const weeklyCtx = getWeeklyContext();
    if (weeklyCtx) upcomingEvents.unshift(weeklyCtx);
  } catch {}

  // 6. Generate AI suggestions
  let suggestions: string[] = [];
  try {
    const anthropic = new Anthropic();

    // Build context for Claude
    const staleCategories = categoryCoverage
      .filter((c) => c.daysAgo > 3)
      .sort((a, b) => b.daysAgo - a.daysAgo);

    const recentCategories = posts.slice(0, 5).map((p) => categorizePost(p.tags));
    const categoryFrequency: Record<string, number> = {};
    for (const cat of recentCategories) {
      categoryFrequency[cat] = (categoryFrequency[cat] || 0) + 1;
    }
    const overRepresented = Object.entries(categoryFrequency)
      .filter(([, count]) => count >= 3)
      .map(([cat]) => cat);

    // Social engagement by category
    const engagementByCategory: Record<string, number> = {};
    for (const entry of socialLog) {
      if (!entry.slug) continue;
      const post = posts.find((p) => p.slug === entry.slug);
      if (post) {
        const cat = categorizePost(post.tags);
        engagementByCategory[cat] = (engagementByCategory[cat] || 0) + 1;
      }
    }

    const prompt = `You are a content strategist for R2F Trading (ICT trading coaching). Analyze this data and give exactly 4 actionable suggestions (one sentence each, plain text, no bullets or numbering).

CATEGORY COVERAGE (last 14 days):
${categoryCoverage.map((c) => `- ${c.category}: ${c.count} posts, last posted ${c.daysAgo === 999 ? "never" : c.daysAgo + " days ago"}`).join("\n")}

OVER-REPRESENTED IN LAST 5 POSTS: ${overRepresented.length > 0 ? overRepresented.join(", ") : "None - good diversity"}

SOCIAL ENGAGEMENT BY CATEGORY: ${JSON.stringify(engagementByCategory)}

UPCOMING MARKET EVENTS: ${upcomingEvents.join(", ") || "None notable"}

HEALTH SCORE: ${healthScore}%

Suggestions should be specific, mentioning exact categories, days, or events. Focus on gaps and opportunities.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    suggestions = text
      .split("\n")
      .map((s) => s.replace(/^\d+[\.\)]\s*/, "").replace(/^[-*]\s*/, "").trim())
      .filter((s) => s.length > 10)
      .slice(0, 5);
  } catch {
    // Fallback suggestions without AI
    const stale = categoryCoverage.filter((c) => c.daysAgo > 7);
    suggestions = stale.map(
      (c) => `You haven't posted about ${c.category} in ${c.daysAgo === 999 ? "a long time" : c.daysAgo + " days"}. Consider writing one soon.`
    );
    if (suggestions.length === 0) {
      suggestions = ["Your content coverage is looking good! Keep up the variety."];
    }
  }

  // 7. Build upcoming schedule (next 7 days)
  const schedule: { date: string; dayName: string; planned: string[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayPosts = posts
      .filter((p) => p.date === dateStr)
      .map((p) => p.title);

    // Add cron info for future days
    const planned = [...dayPosts];
    if (i > 0 && dayPosts.length === 0) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        planned.push("Auto-generate scheduled (2 posts/day)");
      }
    }
    schedule.push({ date: dateStr, dayName, planned });
  }

  return NextResponse.json({
    healthScore,
    categoryCoverage,
    suggestions,
    upcomingEvents,
    schedule,
  });
}
