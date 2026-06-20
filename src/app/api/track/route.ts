import { NextRequest, NextResponse } from "next/server";
import { updateJsonFile } from "@/lib/github";
import { normalizeSubscriber, addEventToSubscriber } from "@/lib/lead-scoring";

type QueuedEvent = { email: string; event: string; date: string; metadata?: Record<string, string> };

export async function POST(req: NextRequest) {
  try {
    const { email, event, metadata } = await req.json();
    if (!email || typeof email !== "string") return NextResponse.json({ ok: true });
    // Validate event name: this string flows into commit messages and the score
    // log. Constrain it so it can't inject text or arbitrary keys.
    if (typeof event !== "string" || !/^[a-z_]{1,40}$/.test(event)) {
      return NextResponse.json({ ok: true });
    }

    // High-value events update subscriber immediately
    const highValueEvents = ["coaching_page_view", "contact_page_view", "calendly_click", "starter_kit_view"];

    if (highValueEvents.includes(event)) {
      // Atomic read-modify-write so we don't lose score updates that race the
      // drip cron / other tracking writes on subscribers.json.
      try {
        await updateJsonFile<Record<string, unknown>[]>(
          "data/subscribers.json",
          (subscribers) => {
            const idx = subscribers.findIndex(
              (s) => (s as { email?: string }).email === email
            );
            if (idx >= 0) {
              const sub = normalizeSubscriber(subscribers[idx] as Record<string, unknown>);
              // Spread the original record so non-normalized fields
              // (staleReengageSent, hotFollowUpSent, reviewRequested,
              // abandonmentEmailSent, referralCode, name, phone) survive.
              subscribers[idx] = { ...subscribers[idx], ...addEventToSubscriber(sub, event, metadata) };
            }
            return subscribers;
          },
          [],
          `Lead score: ${email.split("@")[0]} +${event}`
        );
      } catch {}
    } else {
      // Low-value events queue for batch processing (during drip cron)
      try {
        await updateJsonFile<QueuedEvent[]>(
          "data/events-queue.json",
          (queue) => {
            queue.push({ email, event, date: new Date().toISOString(), metadata });
            return queue.length > 500 ? queue.slice(-500) : queue;
          },
          [],
          `Event: ${event}`
        );
      } catch {}
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Always return ok — tracking should never error to client
  }
}
