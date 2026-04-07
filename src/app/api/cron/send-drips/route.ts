import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { sendEmail } from "@/lib/resend";
import { normalizeSubscriber, addEventToSubscriber, type ScoredSubscriber } from "@/lib/lead-scoring";
import {
  beginnerMistakesEmail,
  ictConceptsEmail,
  successStoryEmail,
  coachingCtaEmail,
  socialProofEmail,
  bookCallSoftEmail,
  bookCallUrgentEmail,
  limitedSpotsEmail,
} from "@/lib/email-templates";

export const maxDuration = 60;

// Template registry for tracking which emails have been sent
const TEMPLATES: Record<string, () => { subject: string; html: string }> = {
  beginnerMistakes: beginnerMistakesEmail,
  ictConcepts: ictConceptsEmail,
  successStory: successStoryEmail,
  coachingCta: coachingCtaEmail,
  socialProof: socialProofEmail,
  bookCallSoft: bookCallSoftEmail,
  bookCallUrgent: bookCallUrgentEmail,
  limitedSpots: limitedSpotsEmail,
};

// Drip sequences by segment — [day, templateKey]
const COLD_SEQUENCE: [number, string][] = [
  [2, "beginnerMistakes"],
  [5, "ictConcepts"],
  [8, "successStory"],
  [14, "coachingCta"],
];

const WARM_SEQUENCE: [number, string][] = [
  [2, "beginnerMistakes"],
  [4, "socialProof"],
  [7, "bookCallSoft"],
  [12, "limitedSpots"],
];

const HOT_SEQUENCE: [number, string][] = [
  [0, "bookCallUrgent"],
  [3, "socialProof"],
  [7, "limitedSpots"],
];

function getSequence(segment: string): [number, string][] {
  if (segment === "hot") return HOT_SEQUENCE;
  if (segment === "warm") return WARM_SEQUENCE;
  return COLD_SEQUENCE;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let subscribers: Record<string, unknown>[] = [];
    try {
      const raw = await readFile("data/subscribers.json");
      subscribers = JSON.parse(raw);
    } catch {
      return NextResponse.json({ sent: 0, message: "No subscribers yet" });
    }

    // Process events queue first — update scores before sending
    try {
      const queueRaw = await readFile("data/events-queue.json");
      const queue: { email: string; event: string; date: string }[] = JSON.parse(queueRaw);
      if (queue.length > 0) {
        for (const evt of queue) {
          const idx = subscribers.findIndex((s: Record<string, unknown>) => s.email === evt.email);
          if (idx >= 0) {
            const sub = normalizeSubscriber(subscribers[idx]);
            subscribers[idx] = addEventToSubscriber(sub, evt.event) as unknown as Record<string, unknown>;
          }
        }
        await commitFile("data/events-queue.json", "[]", "Process events queue").catch(() => {});
      }
    } catch {} // Queue might not exist yet

    const now = Date.now();
    let emailsSent = 0;
    let updated = false;

    for (let i = 0; i < subscribers.length; i++) {
      if (emailsSent >= 90) break;

      const sub: ScoredSubscriber = normalizeSubscriber(subscribers[i]);
      const daysSinceSignup = Math.floor((now - new Date(sub.date).getTime()) / 86400000);
      const sequence = getSequence(sub.segment);
      const history = sub.dripsHistory || [];

      // Find the next email in this subscriber's sequence that they haven't received yet
      let sent = false;
      for (const [day, templateKey] of sequence) {
        if (daysSinceSignup < day) continue;
        if (history.includes(templateKey)) continue;

        // Send this email
        const templateFn = TEMPLATES[templateKey];
        if (!templateFn) continue;

        try {
          const { subject, html } = templateFn();
          await sendEmail(sub.email, subject, html);
          sub.dripsHistory = [...history, templateKey];
          sub.dripsSent = sub.dripsHistory.length;
          emailsSent++;
          updated = true;
          sent = true;
          break; // Only send one email per subscriber per cron run
        } catch {
          // Skip failed sends, will retry next day
        }
      }

      // Always write back the normalized subscriber (backward compat upgrade)
      subscribers[i] = sub as unknown as Record<string, unknown>;
      if (!sent && !sub.score) continue; // No changes needed
      updated = true;
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
