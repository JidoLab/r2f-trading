import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { sendEmail } from "@/lib/resend";
import {
  beginnerMistakesEmail,
  ictConceptsEmail,
  successStoryEmail,
  coachingCtaEmail,
} from "@/lib/email-templates";

export const maxDuration = 60;

interface Subscriber {
  email: string;
  date: string;
  dripsSent: number;
}

const DRIP_SCHEDULE = [
  { day: 2, getEmail: beginnerMistakesEmail },
  { day: 5, getEmail: ictConceptsEmail },
  { day: 8, getEmail: successStoryEmail },
  { day: 14, getEmail: coachingCtaEmail },
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let subscribers: Subscriber[] = [];
    try {
      const raw = await readFile("data/subscribers.json");
      subscribers = JSON.parse(raw);
    } catch {
      return NextResponse.json({ sent: 0, message: "No subscribers yet" });
    }

    const now = Date.now();
    let emailsSent = 0;
    let updated = false;

    for (const sub of subscribers) {
      if (emailsSent >= 90) break; // Stay within Resend free tier
      if (sub.dripsSent >= DRIP_SCHEDULE.length) continue; // All drips sent

      const daysSinceSignup = Math.floor((now - new Date(sub.date).getTime()) / 86400000);
      const nextDrip = DRIP_SCHEDULE[sub.dripsSent];

      if (daysSinceSignup >= nextDrip.day) {
        try {
          const { subject, html } = nextDrip.getEmail();
          await sendEmail(sub.email, subject, html);
          sub.dripsSent++;
          emailsSent++;
          updated = true;
        } catch {
          // Skip failed sends, will retry next day
        }
      }
    }

    if (updated) {
      await commitFile(
        "data/subscribers.json",
        JSON.stringify(subscribers, null, 2),
        `Drip campaign: sent ${emailsSent} emails`
      );
    }

    return NextResponse.json({ sent: emailsSent, total: subscribers.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Drip failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
