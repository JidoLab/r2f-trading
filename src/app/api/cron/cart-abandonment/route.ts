import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { sendEmail } from "@/lib/resend";
import { normalizeSubscriber, type ScoredSubscriber } from "@/lib/lead-scoring";
import {
  coachingAbandonmentEmail,
  starterKitAbandonmentEmail,
} from "@/lib/email-templates";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Load subscribers
    let subscribers: Record<string, unknown>[] = [];
    try {
      subscribers = JSON.parse(await readFile("data/subscribers.json"));
    } catch {
      return NextResponse.json({ success: true, sent: 0, message: "No subscribers file" });
    }

    // Load payments to check who has already paid
    let payments: { email?: string; payer_email?: string }[] = [];
    try {
      payments = JSON.parse(await readFile("data/payments.json"));
    } catch {}

    // Load starter kit purchases
    let starterKitPurchases: { email?: string }[] = [];
    try {
      starterKitPurchases = JSON.parse(await readFile("data/starter-kit-purchases.json"));
    } catch {}

    const paidEmails = new Set([
      ...payments.map((p) => (p.email || p.payer_email || "").toLowerCase()),
      ...starterKitPurchases.map((p) => (p.email || "").toLowerCase()),
    ].filter(Boolean));

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    let emailsSent = 0;
    let updated = false;
    const MAX_EMAILS = 10;
    const results: { email: string; template: string }[] = [];

    for (const rawSub of subscribers) {
      if (emailsSent >= MAX_EMAILS) break;

      const sub = normalizeSubscriber(rawSub) as ScoredSubscriber & { abandonmentEmailSent?: boolean };

      // Skip if already sent abandonment email
      if ((rawSub as Record<string, unknown>).abandonmentEmailSent) continue;

      // Skip if they've paid
      if (paidEmails.has(sub.email.toLowerCase())) continue;

      // Check for coaching_page_view or starter_kit_view in the last 7 days
      const recentEvents = (sub.events || []).filter((e) => {
        const eventAge = now - new Date(e.date).getTime();
        return eventAge < sevenDaysMs && eventAge > 0;
      });

      const hasCoachingView = recentEvents.some((e) => e.type === "coaching_page_view");
      const hasStarterKitView = recentEvents.some((e) => e.type === "starter_kit_view");

      if (!hasCoachingView && !hasStarterKitView) continue;

      // Determine which email to send (coaching takes priority)
      const name = (rawSub as Record<string, unknown>).name as string || sub.email.split("@")[0];
      let emailData: { subject: string; html: string };
      let template: string;

      if (hasCoachingView) {
        emailData = coachingAbandonmentEmail(name);
        template = "coaching_abandonment";
      } else {
        emailData = starterKitAbandonmentEmail(name);
        template = "starter_kit_abandonment";
      }

      try {
        await sendEmail(sub.email, emailData.subject, emailData.html);
        emailsSent++;
        results.push({ email: sub.email, template });

        // Mark as sent
        (rawSub as Record<string, unknown>).abandonmentEmailSent = true;
        updated = true;
      } catch (err) {
        console.error(`[cart-abandonment] Failed to send to ${sub.email}:`, err);
      }
    }

    // Save updated subscribers
    if (updated) {
      await commitFile(
        "data/subscribers.json",
        JSON.stringify(subscribers, null, 2),
        `Cart abandonment: ${emailsSent} emails sent`
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      sent: emailsSent,
      results,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
