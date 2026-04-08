import { NextRequest, NextResponse } from "next/server";
import { commitFile, readFile } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const { plan, amount, payerEmail, payerName, orderId, status } = await req.json();

    const payment = {
      plan,
      amount,
      payerEmail,
      payerName,
      orderId,
      status,
      date: new Date().toISOString(),
    };

    // Save payment record to GitHub
    const today = new Date().toISOString().split("T")[0];
    let payments: Record<string, unknown>[] = [];
    try {
      payments = JSON.parse(await readFile("data/payments.json"));
    } catch {}
    payments.push(payment);
    await commitFile("data/payments.json", JSON.stringify(payments, null, 2), `Payment: ${plan} — $${amount} from ${payerEmail}`);

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
            <p style="color:#333;font-size:16px;">Hey ${payerName || "there"},</p>
            <p style="color:#555;">Thank you for investing in your trading journey with R2F Trading! Your payment has been received.</p>
            <div style="background:white;padding:20px;border-radius:8px;border:1px solid #e5e5e5;margin:20px 0;">
              <p style="margin:0 0 8px;color:#333;"><strong>Plan:</strong> ${plan}</p>
              <p style="margin:0 0 8px;color:#333;"><strong>Amount:</strong> $${amount} USD</p>
              <p style="margin:0;color:#333;"><strong>Order ID:</strong> ${orderId}</p>
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
        `💰 New Payment: ${plan} — $${amount} from ${payerEmail}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;">
          <h2 style="color:#0d2137;">New Payment Received!</h2>
          <div style="background:#f0fff0;padding:20px;border-radius:8px;border:1px solid #90ee90;">
            <p style="margin:0 0 8px;"><strong>Plan:</strong> ${plan}</p>
            <p style="margin:0 0 8px;"><strong>Amount:</strong> $${amount} USD</p>
            <p style="margin:0 0 8px;"><strong>Email:</strong> ${payerEmail}</p>
            <p style="margin:0 0 8px;"><strong>Name:</strong> ${payerName || "N/A"}</p>
            <p style="margin:0 0 8px;"><strong>PayPal Order:</strong> ${orderId}</p>
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
            text: `💰 *NEW PAYMENT*\n\nPlan: ${plan}\nAmount: $${amount}\nEmail: ${payerEmail}\nName: ${payerName || "N/A"}\nOrder: ${orderId}\n\nReach out to schedule their first session!`,
            parse_mode: "Markdown",
          }),
        });
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
