import { NextRequest, NextResponse } from "next/server";
import { commitFile, readFile } from "@/lib/github";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "@/lib/whatsapp";
import { verifyPayPalOrder } from "@/lib/paypal";
import { escapeHtml, sanitizeText, isValidEmail } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    if (!orderId) {
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }

    // SERVER-SIDE VERIFICATION: confirm the order is a real, COMPLETED PayPal
    // payment before recording anything. Without this, the endpoint trusted the
    // client's POST body and anyone could fabricate a payment + spam emails.
    const v = await verifyPayPalOrder(orderId);
    if (!v.ok) {
      console.error(`[payment-success] PayPal verification failed: ${v.reason}`);
      return NextResponse.json(
        { error: "Payment could not be verified" },
        { status: 402 }
      );
    }

    // Trusted values from PayPal; only the plan label comes from the client.
    const plan = sanitizeText(body.plan, 60) || "Coaching";
    const amount = v.amount || "";
    const payerEmail = (v.payerEmail || body.payerEmail || "").toString().trim();
    const payerName = sanitizeText(v.payerName || body.payerName || "", 80);
    if (!isValidEmail(payerEmail)) {
      return NextResponse.json({ error: "Invalid payer email" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Idempotency: a replayed/duplicate POST for the same order must not create
    // a second payment record (which would inflate revenue totals).
    let payments: Record<string, unknown>[] = [];
    try {
      payments = JSON.parse(await readFile("data/payments.json"));
    } catch {}
    if (payments.some((p) => p.orderId === orderId)) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    payments.push({
      plan,
      amount,
      payerEmail,
      payerName,
      orderId,
      status: v.status,
      date: new Date().toISOString(),
    });
    await commitFile(
      "data/payments.json",
      JSON.stringify(payments, null, 2),
      `Payment: ${plan} — $${amount}`
    );

    const safePlan = escapeHtml(plan);
    const safeName = escapeHtml(payerName || "there");
    const safeAmount = escapeHtml(amount);
    const safeOrder = escapeHtml(orderId);

    // Send confirmation email to buyer
    try {
      const { sendEmail } = await import("@/lib/resend");
      await sendEmail(
        payerEmail,
        `Welcome to R2F Trading — ${plan}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0d2137;padding:32px;text-align:center;border-radius:8px 8px 0 0;">
            <h1 style="color:#c9a84c;margin:0;font-size:28px;">Payment Confirmed!</h1>
          </div>
          <div style="padding:32px;background:#f9f9f9;border-radius:0 0 8px 8px;">
            <p style="color:#333;font-size:16px;">Hey ${safeName},</p>
            <p style="color:#555;">Thank you for investing in your trading journey with R2F Trading! Your payment has been received.</p>
            <div style="background:white;padding:20px;border-radius:8px;border:1px solid #e5e5e5;margin:20px 0;">
              <p style="margin:0 0 8px;color:#333;"><strong>Plan:</strong> ${safePlan}</p>
              <p style="margin:0 0 8px;color:#333;"><strong>Amount:</strong> $${safeAmount} USD</p>
              <p style="margin:0;color:#333;"><strong>Order ID:</strong> ${safeOrder}</p>
            </div>
            <p style="color:#555;"><strong>What happens next:</strong></p>
            <ol style="color:#555;">
              <li>Harvest will reach out within 24 hours to schedule your first session</li>
              <li>You'll receive access to your coaching resources and materials</li>
              <li>Add Harvest on Telegram (<a href="https://t.me/Road2Funded">@Road2Funded</a>) for quick communication</li>
            </ol>
            <div style="text-align:center;margin-top:24px;">
              <a href="https://r2ftrading.com/contact" style="display:inline-block;background:#c9a84c;color:#0d2137;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Book Your First Session</a>
            </div>
            <p style="color:#888;font-size:12px;margin-top:24px;text-align:center;">Questions? Reply to this email or message us on WhatsApp: wa.me/66935754757</p>
          </div>
        </div>`
      );
    } catch {}

    // Send notification to Harvest
    try {
      const { sendEmail } = await import("@/lib/resend");
      await sendEmail(
        "road2funded@gmail.com",
        `💰 New Payment: ${plan} — $${amount}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;">
          <h2 style="color:#0d2137;">New Payment Received!</h2>
          <div style="background:#f0fff0;padding:20px;border-radius:8px;border:1px solid #90ee90;">
            <p style="margin:0 0 8px;"><strong>Plan:</strong> ${safePlan}</p>
            <p style="margin:0 0 8px;"><strong>Amount:</strong> $${safeAmount} USD</p>
            <p style="margin:0 0 8px;"><strong>Email:</strong> ${escapeHtml(payerEmail)}</p>
            <p style="margin:0 0 8px;"><strong>Name:</strong> ${safeName}</p>
            <p style="margin:0 0 8px;"><strong>PayPal Order:</strong> ${safeOrder}</p>
            <p style="margin:0;"><strong>Date:</strong> ${today}</p>
          </div>
          <p style="color:#555;margin-top:16px;">Reach out to schedule their first session!</p>
        </div>`
      );
    } catch {}

    // Notify via Telegram
    try {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
      if (tgToken && chatId) {
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `💰 NEW PAYMENT\n\nPlan: ${plan}\nAmount: $${amount}\nEmail: ${payerEmail}\nName: ${payerName || "N/A"}\nOrder: ${orderId}\n\nReach out to schedule their first session!`,
          }),
        });
      }
    } catch {}

    // WhatsApp payment confirmation (non-blocking)
    try {
      if (isWhatsAppConfigured()) {
        let subscriberPhone: string | undefined;
        try {
          const subsRaw = await readFile("data/subscribers.json");
          const subscribers = JSON.parse(subsRaw);
          const sub = subscribers.find((s: { email: string; phone?: string }) => s.email === payerEmail);
          if (sub?.phone) subscriberPhone = sub.phone;
        } catch {}

        if (subscriberPhone) {
          const displayName = payerName || "there";
          sendWhatsAppMessage(
            subscriberPhone,
            `Hey ${displayName}! Payment received for ${plan}. I'll reach out within 24 hours to schedule your first session. In the meantime, add me on Telegram: t.me/Road2Funded 🙌`
          ).catch(() => {});
        }
      }
    } catch {}

    // Save student record for onboarding automation (idempotent by orderId)
    try {
      let students: Record<string, unknown>[] = [];
      try {
        students = JSON.parse(await readFile("data/students.json"));
      } catch {}

      const exists = students.some((s) => s.orderId === orderId);
      if (!exists) {
        const nextCheckIn = new Date();
        nextCheckIn.setDate(nextCheckIn.getDate() + 1);

        students.push({
          email: payerEmail,
          name: payerName || "",
          plan,
          amount,
          orderId,
          startDate: new Date().toISOString(),
          onboardingStep: 0,
          onboardingEmails: [] as string[],
          nextCheckIn: nextCheckIn.toISOString(),
          reviewRequested: false,
        });

        await commitFile(
          "data/students.json",
          JSON.stringify(students, null, 2),
          `New student: ${payerEmail} — ${plan}`
        );
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
