import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";

export const maxDuration = 30;

/**
 * Resend Webhook — captures email.opened and email.clicked events
 * to track open rates and click rates for A/B test analytics.
 *
 * Setup:
 * 1. Go to resend.com → Webhooks → Add Endpoint
 * 2. URL: https://r2ftrading.com/api/webhooks/resend
 * 3. Events: email.delivered, email.opened, email.clicked, email.bounced
 * 4. Copy the signing secret → add as RESEND_WEBHOOK_SECRET on Vercel
 */

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    click?: { link: string };
  };
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature if secret is configured
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers.get("resend-signature") || req.headers.get("svix-signature") || "";
      // Resend uses Svix for webhooks — basic verification
      if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }
      // For production, use svix package to verify. For now, check header exists.
    }

    const event: ResendWebhookEvent = await req.json();
    const { type, data } = event;
    const recipientEmail = data.to?.[0] || "";
    const subject = data.subject || "";

    if (!recipientEmail) {
      return NextResponse.json({ ok: true, skipped: "no recipient" });
    }

    // Load email analytics data
    let analytics: Record<string, {
      delivered: number;
      opened: number;
      clicked: number;
      bounced: number;
      lastOpened?: string;
      lastClicked?: string;
      clickedLinks: string[];
      subjects: Record<string, { delivered: number; opened: number; clicked: number }>;
    }> = {};

    try {
      analytics = JSON.parse(await readFile("data/email-analytics.json"));
    } catch {}

    // Initialize recipient record if needed
    if (!analytics[recipientEmail]) {
      analytics[recipientEmail] = {
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        clickedLinks: [],
        subjects: {},
      };
    }

    const record = analytics[recipientEmail];

    // Initialize subject tracking
    if (subject && !record.subjects[subject]) {
      record.subjects[subject] = { delivered: 0, opened: 0, clicked: 0 };
    }

    // Process event type
    switch (type) {
      case "email.delivered":
        record.delivered++;
        if (subject) record.subjects[subject].delivered++;
        break;

      case "email.opened":
        record.opened++;
        record.lastOpened = event.created_at;
        if (subject) record.subjects[subject].opened++;
        break;

      case "email.clicked":
        record.clicked++;
        record.lastClicked = event.created_at;
        if (subject) record.subjects[subject].clicked++;
        if (data.click?.link && !record.clickedLinks.includes(data.click.link)) {
          record.clickedLinks.push(data.click.link);
        }
        break;

      case "email.bounced":
        record.bounced++;
        break;

      default:
        return NextResponse.json({ ok: true, skipped: "unhandled event type" });
    }

    // Save updated analytics
    await commitFile(
      "data/email-analytics.json",
      JSON.stringify(analytics, null, 2),
      `Email ${type.split(".")[1]}: ${recipientEmail.replace(/@.*/, "@***")}`
    );

    // Also update subscriber lead score for engagement events
    if (type === "email.opened" || type === "email.clicked") {
      try {
        const subscribersRaw = await readFile("data/subscribers.json");
        const subscribers = JSON.parse(subscribersRaw);
        const subIdx = subscribers.findIndex((s: { email: string }) => s.email === recipientEmail);

        if (subIdx >= 0) {
          const sub = subscribers[subIdx];
          const eventType = type === "email.opened" ? "email_open" : "email_click";
          const events = sub.events || [];
          events.push({ type: eventType, date: new Date().toISOString() });
          sub.events = events;

          // Update score
          const pointMap: Record<string, number> = { email_open: 3, email_click: 8 };
          sub.score = (sub.score || 0) + (pointMap[eventType] || 0);
          sub.segment = sub.score >= 50 ? "hot" : sub.score >= 20 ? "warm" : "cold";
          sub.lastActivity = new Date().toISOString();

          subscribers[subIdx] = sub;
          await commitFile(
            "data/subscribers.json",
            JSON.stringify(subscribers, null, 2),
            `Lead score: ${eventType} from ${recipientEmail.replace(/@.*/, "@***")}`
          );
        }
      } catch {}
    }

    return NextResponse.json({ ok: true, type, recipient: recipientEmail });
  } catch (err: unknown) {
    console.error("[resend-webhook]", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
