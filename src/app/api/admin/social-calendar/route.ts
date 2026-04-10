import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile } from "@/lib/github";

export const dynamic = "force-dynamic";

interface SocialPost {
  platform: string;
  type: string;
  content: string;
  time: string;
  date?: string;
}

interface SocialLogEntry {
  platform?: string;
  type?: string;
  content?: string;
  title?: string;
  date?: string;
  time?: string;
  postedAt?: string;
  createdAt?: string;
  url?: string;
  text?: string;
  body?: string;
}

function getMonday(dateStr?: string): Date {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getWeekDates(monday: Date): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

function extractDate(entry: SocialLogEntry): string {
  const raw = entry.date || entry.postedAt || entry.createdAt || entry.time || "";
  if (!raw) return "";
  try {
    return new Date(raw).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function extractTime(entry: SocialLogEntry): string {
  const raw = entry.postedAt || entry.time || entry.createdAt || entry.date || "";
  if (!raw) return "";
  try {
    return new Date(raw).toISOString().split("T")[1]?.slice(0, 5) || "";
  } catch {
    return "";
  }
}

function extractContent(entry: SocialLogEntry): string {
  const text = entry.content || entry.title || entry.text || entry.body || entry.url || "";
  return text.slice(0, 120);
}

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekParam = req.nextUrl.searchParams.get("week");
  const monday = getMonday(weekParam || undefined);
  const weekDates = getWeekDates(monday);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const posts: SocialPost[] = [];

  // Read social-log.json
  try {
    const raw = await readFile("data/social-log.json");
    const logs: SocialLogEntry[] = JSON.parse(raw);
    for (const entry of logs) {
      const date = extractDate(entry);
      if (date >= weekStart && date <= weekEnd) {
        posts.push({
          platform: entry.platform || "unknown",
          type: entry.type || "text",
          content: extractContent(entry),
          time: extractTime(entry),
          date,
        });
      }
    }
  } catch {}

  // Read reddit-engage-log.json
  try {
    const raw = await readFile("data/reddit-engage-log.json");
    const logs: SocialLogEntry[] = JSON.parse(raw);
    for (const entry of logs) {
      const date = extractDate(entry);
      if (date >= weekStart && date <= weekEnd) {
        posts.push({
          platform: "reddit",
          type: "reddit-comment",
          content: extractContent(entry),
          time: extractTime(entry),
          date,
        });
      }
    }
  } catch {}

  // Read twitter-engage-log.json
  try {
    const raw = await readFile("data/twitter-engage-log.json");
    const logs: SocialLogEntry[] = JSON.parse(raw);
    for (const entry of logs) {
      const date = extractDate(entry);
      if (date >= weekStart && date <= weekEnd) {
        posts.push({
          platform: "twitter",
          type: "twitter-reply",
          content: extractContent(entry),
          time: extractTime(entry),
          date,
        });
      }
    }
  } catch {}

  // Build days array
  const days = weekDates.map((date) => ({
    date,
    posts: posts.filter((p) => p.date === date).sort((a, b) => (a.time > b.time ? 1 : -1)),
  }));

  // Calculate streak — count consecutive days with posts going backward from today
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const allDates = new Set(posts.map((p) => p.date));
  // Also check beyond this week for streak
  try {
    const raw = await readFile("data/social-log.json");
    const logs: SocialLogEntry[] = JSON.parse(raw);
    for (const entry of logs) {
      const d = extractDate(entry);
      if (d) allDates.add(d);
    }
  } catch {}

  const checkDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const ds = formatDate(checkDate);
    if (allDates.has(ds)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const weekTotal = posts.length;

  return NextResponse.json({
    week: weekStart,
    days,
    streak,
    weekTotal,
  });
}
