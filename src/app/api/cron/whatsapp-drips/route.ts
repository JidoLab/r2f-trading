import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "@/lib/whatsapp";

export const maxDuration = 60;

interface Subscriber {
  email: string;
  date: string;
  phone?: string;
  whatsappDripsSent?: string[];
  [key: string]: unknown;
}

// WhatsApp drip messages keyed by day offset from signup
const DRIP_SEQUENCE: { day: number; key: string; message: (name: string) => string }[] = [
  {
    day: 2,
    key: "day2_tip",
    message: () =>
      "Quick tip: Before every trade, ask yourself \u2014 am I chasing or planning? If you can't answer in 2 seconds, skip the trade. \ud83c\udfaf",
  },
  {
    day: 5,
    key: "day5_social_proof",
    message: () =>
      "One of my students just passed their FTMO challenge after 6 weeks. The secret? Following the plan, not the emotion. You got this \ud83d\udcaa",
  },
  {
    day: 8,
    key: "day8_free_class",
    message: (name: string) =>
      `Hey ${name}, have you checked out our free ICT class yet? It covers the 3 setups that actually work \u2192 r2ftrading.com/free-class`,
  },
  {
    day: 14,
    key: "day14_checkin",
    message: (name: string) =>
      `Quick question, ${name}. Are you still actively trading? I'd love to hear how it's going. Reply anytime \ud83d\udcca`,
  },
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ skipped: true, reason: "WhatsApp not configured" });
  }

  try {
    let subscribers: Subscriber[] = [];
    try {
      subscribers = JSON.parse(await readFile("data/subscribers.json"));
    } catch {
      return NextResponse.json({ skipped: true, reason: "No subscribers file" });
    }

    const now = new Date();
    let messagesSent = 0;
    let updated = false;
    const MAX_MESSAGES_PER_RUN = 20;

    for (const sub of subscribers) {
      if (messagesSent >= MAX_MESSAGES_PER_RUN) break;

      // Skip subscribers without phone numbers
      if (!sub.phone) continue;

      const signupDate = new Date(sub.date);
      const daysSinceSignup = Math.floor(
        (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const sent = sub.whatsappDripsSent || [];

      // Check if all drips have been sent
      if (sent.length >= DRIP_SEQUENCE.length) continue;

      // Find the next drip to send (only one per run per subscriber)
      for (const drip of DRIP_SEQUENCE) {
        if (sent.includes(drip.key)) continue;
        if (daysSinceSignup < drip.day) break; // Not time yet, and sequence is ordered

        const displayName = (sub.email || "").split("@")[0];
        try {
          await sendWhatsAppMessage(sub.phone, drip.message(displayName));
          if (!sub.whatsappDripsSent) sub.whatsappDripsSent = [];
          sub.whatsappDripsSent.push(drip.key);
          messagesSent++;
          updated = true;
        } catch {}

        // Only one drip per subscriber per run
        break;
      }
    }

    if (updated) {
      await commitFile(
        "data/subscribers.json",
        JSON.stringify(subscribers, null, 2),
        `WhatsApp drips: sent ${messagesSent} messages`
      );
    }

    return NextResponse.json({ success: true, messagesSent });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
