import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { sendTelegramReport } from "@/lib/telegram-report";

export const maxDuration = 120;

interface RetryLogEntry {
  cron: string;
  retriedAt: string;
  result: "success" | "failed";
  statusCode?: number;
}

interface RetryLog {
  date: string;
  entries: RetryLogEntry[];
}

const CRITICAL_CRONS = [
  {
    name: "generate-post",
    route: "generate-post",
    check: async (): Promise<boolean> => {
      const today = new Date().toISOString().split("T")[0];
      try {
        const files = await import("@/lib/github").then((m) => m.listFiles("content/blog"));
        // Check if any blog post file contains today's date
        return files.some((f: string) => f.includes(today.replace(/-/g, "")));
      } catch {
        return false;
      }
    },
  },
  {
    name: "find-reply-opportunities",
    route: "find-reply-opportunities",
    check: async (): Promise<boolean> => {
      const today = new Date().toISOString().split("T")[0];
      try {
        const raw = await readFile("data/reply-suggestions.json");
        const data = JSON.parse(raw);
        return Array.isArray(data) && data.some((d: { createdAt?: string }) => d.createdAt?.startsWith(today));
      } catch {
        return false;
      }
    },
  },
  {
    name: "find-forum-opportunities",
    route: "find-forum-opportunities",
    check: async (): Promise<boolean> => {
      const today = new Date().toISOString().split("T")[0];
      try {
        const raw = await readFile("data/reply-suggestions.json");
        const data = JSON.parse(raw);
        return (
          Array.isArray(data) &&
          data.some(
            (d: { createdAt?: string; platform?: string }) =>
              d.createdAt?.startsWith(today) &&
              d.platform &&
              !["youtube", "facebook_group", "linkedin", "medium"].includes(d.platform),
          )
        );
      } catch {
        return false;
      }
    },
  },
  {
    name: "generate-short",
    route: "generate-short",
    check: async (): Promise<boolean> => {
      const today = new Date().toISOString().split("T")[0];
      try {
        const files = await import("@/lib/github").then((m) => m.listFiles("data/shorts/renders"));
        return files.some((f: string) => f.includes(today.replace(/-/g, "")));
      } catch {
        return false;
      }
    },
  },
  {
    name: "reddit-engage",
    route: "reddit-engage",
    check: async (): Promise<boolean> => {
      const today = new Date().toISOString().split("T")[0];
      try {
        const raw = await readFile("data/reddit-engage-log.json");
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          return data.some((d: { date?: string; timestamp?: string }) =>
            (d.date || d.timestamp || "").startsWith(today),
          );
        }
        // Could be object with date keys
        return !!data[today];
      } catch {
        return false;
      }
    },
  },
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Load retry log to check what we've already retried today
  let retryLog: RetryLog = { date: today, entries: [] };
  try {
    const raw = await readFile("data/retry-log.json");
    const parsed = JSON.parse(raw);
    if (parsed.date === today) {
      retryLog = parsed;
    }
    // If it's a different day, start fresh
  } catch {
    // First run or file doesn't exist
  }

  const alreadyRetried = new Set(retryLog.entries.map((e) => e.cron));
  const retriedNow: string[] = [];
  const newEntries: RetryLogEntry[] = [];

  for (const cron of CRITICAL_CRONS) {
    // Skip if already retried today
    if (alreadyRetried.has(cron.name)) continue;

    // Check if cron has produced output today
    let hasOutput = false;
    try {
      hasOutput = await cron.check();
    } catch {
      hasOutput = false;
    }

    if (hasOutput) continue;

    // Cron missed — retry it
    console.log(`[retry-missed] Retrying: ${cron.name}`);
    let result: "success" | "failed" = "failed";
    let statusCode = 0;

    try {
      const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://r2ftrading.com";

      const res = await fetch(`${baseUrl}/api/cron/${cron.route}`, {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      statusCode = res.status;
      result = res.ok ? "success" : "failed";
    } catch (err) {
      console.error(`[retry-missed] Failed to call ${cron.route}:`, err);
    }

    newEntries.push({
      cron: cron.name,
      retriedAt: new Date().toISOString(),
      result,
      statusCode,
    });

    retriedNow.push(`${cron.name} (${result})`);
  }

  // Save updated retry log
  if (newEntries.length > 0) {
    retryLog.entries.push(...newEntries);
    await commitFile(
      "data/retry-log.json",
      JSON.stringify(retryLog, null, 2),
      `chore: update retry log ${today}`,
    );

    // Telegram alert
    await sendTelegramReport(
      [
        `🔄 *Auto-Retry Report*`,
        ``,
        ...retriedNow.map((c) => `• ${c}`),
        ``,
        `_Checked ${CRITICAL_CRONS.length} critical crons_`,
      ].join("\n"),
    );
  }

  return NextResponse.json({
    checked: CRITICAL_CRONS.length,
    retried: retriedNow,
    alreadyRetriedToday: Array.from(alreadyRetried),
  });
}
