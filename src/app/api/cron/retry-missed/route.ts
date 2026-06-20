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
    scheduledDays: [0, 3], // Sun, Wed — matches vercel.json "0 6 * * 0,3"
    check: async (): Promise<boolean> => {
      const today = new Date().toISOString().split("T")[0];
      try {
        const files = await import("@/lib/github").then((m) => m.listFiles("content/blog"));
        // Blog filenames are "YYYY-MM-DD-slug.mdx" so match the hyphenated date.
        // Previously this stripped hyphens ("20260620") which never matched a
        // real filename, so retry-missed thought the post was always missing
        // and re-generated a full blog post (+image+social) every single day.
        return files.some((f: string) => f.includes(today));
      } catch {
        return false;
      }
    },
  },
  {
    name: "find-reply-opportunities",
    route: "find-reply-opportunities",
    scheduledDays: [1, 4], // Mon, Thu — matches "30 0 * * 1,4"
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
    scheduledDays: [1, 4], // Mon, Thu — matches "45 0 * * 1,4"
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
  // generate-short removed from retry-missed on 2026-06-20: shorts production is
  // currently halted (not in vercel.json), and its render files are slug-named
  // with no date, so the date check never matched and retry-missed was firing
  // generate-short every single day — reviving the halted pipeline and burning
  // ElevenLabs/render cost. If shorts are re-enabled, restore this with a
  // date-reliable check (e.g. read each render's createdAt) and scheduledDays.
  {
    name: "reddit-engage",
    route: "reddit-engage",
    scheduledDays: null, // runs daily (multiple times) — always eligible
    check: async (): Promise<boolean> => {
      const today = new Date().toISOString().split("T")[0];
      try {
        const raw = await readFile("data/reddit-engage-log.json");
        const data = JSON.parse(raw);
        // Log entries use `commentedAt` (ISO). Earlier this checked for
        // `date`/`timestamp` which never existed, so retry-missed fired a
        // 5th reddit-engage run every day — increasing duplicate-comment
        // exposure. Field name fix on 2026-06-01.
        if (Array.isArray(data)) {
          return data.some((d: { commentedAt?: string }) =>
            (d.commentedAt || "").startsWith(today),
          );
        }
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

  const todayDow = new Date().getUTCDay(); // 0=Sun..6=Sat (UTC, matches Vercel cron)

  for (const cron of CRITICAL_CRONS) {
    // Skip if already retried today
    if (alreadyRetried.has(cron.name)) continue;

    // Only retry on days this cron is actually scheduled. retry-missed runs
    // daily, but several crons run on specific weekdays (generate-post Sun/Wed,
    // find-*-opportunities Mon/Thu). Without this guard, an absent output on a
    // non-scheduled day looked like a "miss" and retry-missed re-fired the cron
    // every day — duplicate posts and wasted API spend.
    if (cron.scheduledDays && !cron.scheduledDays.includes(todayDow)) continue;

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
