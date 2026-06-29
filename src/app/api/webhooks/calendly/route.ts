import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { verifyCalendlySignature } from "@/lib/calendly";
import { sendTelegramReport, thaiTime } from "@/lib/telegram-report";
import { normalizeSubscriber, addEventToSubscriber } from "@/lib/lead-scoring";

export const dynamic = "force-dynamic";

// Escape the few characters that break Telegram legacy Markdown.
function escMd(s: string): string {
  return String(s || "").replace(/[_*`[]/g, "\\$&");
}

// Mark a matching subscriber as booked (best-effort; alert fires regardless).
async function markBooked(email: string, eventName: string, startTime?: string): Promise<boolean> {
  try {
    const subs = JSON.parse(await readFile("data/subscribers.json")) as Record<string, unknown>[];
    const idx = subs.findIndex(
      (s) => String((s as { email?: string }).email || "").toLowerCase() === email.toLowerCase()
    );
    if (idx < 0) return false;
    const scored = normalizeSubscriber(subs[idx]);
    const updated = addEventToSubscriber(scored, "discovery_call_booked", {
      eventName,
      startTime: startTime || "",
    });
    // Spread original first so non-normalized one-shot flags survive.
    subs[idx] = {
      ...subs[idx],
      ...(updated as unknown as Record<string, unknown>),
      booked: true,
      bookedAt: new Date().toISOString(),
      bookedFor: startTime || "",
    };
    await commitFile(
      "data/subscribers.json",
      JSON.stringify(subs, null, 2),
      `Booking: ${email.split("@")[0]}`
    );
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify signature when the signing key is configured (recommended). If it
  // isn't set yet, we still process but warn — booking alerts are low-stakes.
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (signingKey) {
    const sig = req.headers.get("Calendly-Webhook-Signature");
    if (!verifyCalendlySignature(rawBody, sig, signingKey)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn("[calendly] CALENDLY_WEBHOOK_SIGNING_KEY not set — skipping signature verification");
  }

  let body: { event?: string; payload?: Record<string, unknown> };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const event = body.event;
  const p = body.payload || {};
  const name = (p.name as string) || (p.email as string) || "Someone";
  const email = (p.email as string) || "";
  const scheduled = (p.scheduled_event as Record<string, unknown>) || {};
  const eventName = (scheduled.name as string) || "call";
  const startTime = scheduled.start_time as string | undefined;

  if (event === "invitee.created") {
    await sendTelegramReport(
      [
        `📅 *NEW BOOKING*`,
        ``,
        `*${escMd(name)}* booked: ${escMd(eventName)}`,
        startTime ? `🕒 ${escMd(thaiTime(startTime))} (Bangkok)` : ``,
        email ? `✉️ ${escMd(email)}` : ``,
        ``,
        `It's on your Calendly calendar. Reach out to confirm.`,
      ]
        .filter(Boolean)
        .join("\n")
    );
    if (email) await markBooked(email, eventName, startTime);
  } else if (event === "invitee.canceled") {
    await sendTelegramReport(
      `❌ *Booking canceled*\n\n${escMd(name)} canceled: ${escMd(eventName)}${
        startTime ? `\n🕒 was ${escMd(thaiTime(startTime))}` : ""
      }`
    );
  }

  return NextResponse.json({ ok: true });
}
