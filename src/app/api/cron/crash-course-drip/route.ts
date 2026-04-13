import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { sendEmail } from "@/lib/resend";
import {
  crashCourseDay2,
  crashCourseDay3,
  crashCourseDay4,
  crashCourseDay5,
  crashCourseComplete,
} from "@/lib/email-templates";

export const maxDuration = 60;

interface CrashCourseSubscriber {
  email: string;
  name: string;
  date: string;
  day: number;
  emailsSent: string[];
}

// Day number (days since signup) -> template key and function
const DRIP_SCHEDULE: {
  daysSince: number;
  key: string;
  fn: (name: string) => { subject: string; html: string };
}[] = [
  // Day 1 is sent immediately on signup (handled in subscribe route)
  { daysSince: 1, key: "day2", fn: crashCourseDay2 },
  { daysSince: 2, key: "day3", fn: crashCourseDay3 },
  { daysSince: 3, key: "day4", fn: crashCourseDay4 },
  { daysSince: 4, key: "day5", fn: crashCourseDay5 },
  { daysSince: 5, key: "complete", fn: crashCourseComplete },
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let subscribers: CrashCourseSubscriber[] = [];
    try {
      const raw = await readFile("data/crash-course-subscribers.json");
      subscribers = JSON.parse(raw);
    } catch {
      return NextResponse.json({ sent: 0, message: "No subscribers yet" });
    }

    const now = Date.now();
    let emailsSent = 0;
    let updated = false;

    for (let i = 0; i < subscribers.length; i++) {
      if (emailsSent >= 50) break;

      const sub = subscribers[i];
      const daysSinceSignup = Math.floor(
        (now - new Date(sub.date).getTime()) / 86400000
      );
      const history = sub.emailsSent || [];

      // Find the next email to send for this subscriber
      for (const { daysSince, key, fn } of DRIP_SCHEDULE) {
        if (daysSinceSignup < daysSince) continue;
        if (history.includes(key)) continue;

        try {
          const { subject, html } = fn(sub.name);
          await sendEmail(sub.email, subject, html);

          sub.emailsSent = [...history, key];
          sub.day = daysSince;
          emailsSent++;
          updated = true;
        } catch {
          // Skip failed sends, will retry next run
        }

        // Only send one email per subscriber per run
        break;
      }

      subscribers[i] = sub;
    }

    if (updated) {
      await commitFile(
        "data/crash-course-subscribers.json",
        JSON.stringify(subscribers, null, 2),
        `Crash course drip: sent ${emailsSent} emails`
      );
    }

    return NextResponse.json({
      sent: emailsSent,
      total: subscribers.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Crash course drip failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
