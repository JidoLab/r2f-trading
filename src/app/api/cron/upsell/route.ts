import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { sendEmail } from "@/lib/resend";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Read starter kit purchases
    let purchases: { email: string; date: string; orderId: string }[] = [];
    try {
      purchases = JSON.parse(await readFile("data/starter-kit-purchases.json"));
    } catch {
      return NextResponse.json({ skipped: true, reason: "No starter kit purchases" });
    }

    // Read subscribers for engagement data
    let subscribers: Record<string, unknown>[] = [];
    try {
      subscribers = JSON.parse(await readFile("data/subscribers.json"));
    } catch {}

    const now = Date.now();
    let upsellsSent = 0;
    let updated = false;

    for (const purchase of purchases) {
      if (upsellsSent >= 5) break;

      const daysSincePurchase = Math.floor((now - new Date(purchase.date).getTime()) / 86400000);
      if (daysSincePurchase < 7) continue; // Too soon

      // Find the subscriber
      const subIdx = subscribers.findIndex((s) => (s as { email: string }).email === purchase.email);
      if (subIdx < 0) continue;

      const sub = subscribers[subIdx] as Record<string, unknown>;
      if (sub.upsellEmailSent === true) continue; // Already sent

      // Check engagement: count blog reads since purchase
      const events = (sub.events as { type: string; date: string }[]) || [];
      const blogReads = events.filter(
        (e) => e.type === "blog_read" && new Date(e.date).getTime() > new Date(purchase.date).getTime()
      ).length;

      if (blogReads < 3) continue; // Not engaged enough

      // Send upsell email
      try {
        const name = (sub.name as string) || purchase.email.split("@")[0];
        const { subject, html } = coachingUpsellEmail(name);
        await sendEmail(purchase.email, subject, html);
        sub.upsellEmailSent = true;
        subscribers[subIdx] = sub;
        updated = true;
        upsellsSent++;
      } catch {}
    }

    if (updated) {
      await commitFile(
        "data/subscribers.json",
        JSON.stringify(subscribers, null, 2),
        `Upsell: sent ${upsellsSent} coaching upsell emails`
      );
    }

    return NextResponse.json({ sent: upsellsSent });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

function coachingUpsellEmail(name: string): { subject: string; html: string } {
  return {
    subject: `${name}, ready for the next level?`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#0d2137;padding:24px 32px;">
    <span style="font-size:24px;font-weight:900;color:#fff;">R<span style="color:#c9a84c;">2</span>F</span>
    <span style="font-size:10px;color:rgba(255,255,255,0.6);letter-spacing:3px;text-transform:uppercase;margin-left:6px;">Trading</span>
  </div>
  <div style="padding:32px;">
    <h1 style="color:#0d2137;font-size:22px;margin:0 0 20px;">Hey ${name}, you're doing great.</h1>
    <p style="color:#555;line-height:1.7;">I can see you've been putting in the work with the Starter Kit and reading up on ICT concepts. That's exactly the kind of dedication that separates traders who make it from those who don't.</p>
    <p style="color:#555;line-height:1.7;">The Starter Kit gives you the foundation. But the difference between knowing the concepts and consistently executing them in live markets? That's where personalized coaching comes in.</p>
    <p style="color:#555;line-height:1.7;">I'd love to work with you 1 on 1. Here's what my students typically experience in the first month:</p>
    <ul style="color:#555;line-height:2;">
      <li>Their win rate improves by identifying specific entry mistakes</li>
      <li>They stop overtrading (the #1 account killer)</li>
      <li>They build a custom trading plan for their schedule and risk tolerance</li>
    </ul>
    <p style="color:#555;line-height:1.7;">As a Starter Kit student, you can <strong style="color:#0d2137;">book a free 15 minute discovery call</strong> with me. No pitch, just a real conversation about where you are and what's holding you back.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://r2ftrading.com/contact" style="display:inline-block;background:#c9a84c;color:#0d2137;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;text-transform:uppercase;font-size:14px;">Book Your Free Call</a>
    </div>
    <p style="color:#888;font-size:12px;text-align:center;">
      <a href="https://r2ftrading.com/coaching" style="color:#c9a84c;">View coaching plans</a> · <a href="https://r2ftrading.com/unsubscribe" style="color:#aaa;">Unsubscribe</a>
    </p>
  </div>
</div></body></html>`,
  };
}
