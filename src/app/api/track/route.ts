import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { normalizeSubscriber, addEventToSubscriber } from "@/lib/lead-scoring";

export async function POST(req: NextRequest) {
  try {
    const { email, event, metadata } = await req.json();
    if (!email || !event) return NextResponse.json({ ok: true });

    // High-value events update subscriber immediately
    const highValueEvents = ["coaching_page_view", "contact_page_view", "calendly_click", "starter_kit_view"];

    if (highValueEvents.includes(event)) {
      // Update subscriber score directly
      try {
        const raw = await readFile("data/subscribers.json");
        const subscribers = JSON.parse(raw);
        const idx = subscribers.findIndex((s: { email: string }) => s.email === email);
        if (idx >= 0) {
          const sub = normalizeSubscriber(subscribers[idx]);
          subscribers[idx] = addEventToSubscriber(sub, event, metadata);
          await commitFile(
            "data/subscribers.json",
            JSON.stringify(subscribers, null, 2),
            `Lead score: ${email.split("@")[0]} +${event}`
          );
        }
      } catch {}
    } else {
      // Low-value events queue for batch processing (during drip cron)
      try {
        let queue: { email: string; event: string; date: string; metadata?: Record<string, string> }[] = [];
        try { queue = JSON.parse(await readFile("data/events-queue.json")); } catch {}
        queue.push({ email, event, date: new Date().toISOString(), metadata });
        // Keep queue bounded
        if (queue.length > 500) queue = queue.slice(-500);
        await commitFile("data/events-queue.json", JSON.stringify(queue, null, 2), `Event: ${event}`);
      } catch {}
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Always return ok — tracking should never error to client
  }
}
