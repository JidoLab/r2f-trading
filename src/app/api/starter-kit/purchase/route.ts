import { NextRequest, NextResponse } from "next/server";
import { commitFile, readFile } from "@/lib/github";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { payerEmail, payerName, orderId, status } = await req.json();

    if (!payerEmail || !orderId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate unique access token
    const token = randomBytes(32).toString("hex");
    const now = new Date().toISOString();

    const purchase = {
      token,
      email: payerEmail,
      name: payerName || "",
      orderId,
      status,
      purchaseDate: now,
    };

    // Save to starter-kit-purchases.json on GitHub
    let purchases: Record<string, unknown>[] = [];
    try {
      purchases = JSON.parse(
        await readFile("data/starter-kit-purchases.json")
      );
    } catch {
      // File doesn't exist yet
    }
    purchases.push(purchase);
    await commitFile(
      "data/starter-kit-purchases.json",
      JSON.stringify(purchases, null, 2),
      `Starter Kit purchase: ${payerEmail} — ${orderId}`
    );

    // Also record in payments.json
    let payments: Record<string, unknown>[] = [];
    try {
      payments = JSON.parse(await readFile("data/payments.json"));
    } catch {}
    payments.push({
      plan: "ICT Trading Starter Kit",
      amount: "49.00",
      payerEmail,
      payerName,
      orderId,
      status,
      date: now,
    });
    await commitFile(
      "data/payments.json",
      JSON.stringify(payments, null, 2),
      `Payment: Starter Kit — $49 from ${payerEmail}`
    );

    // Send confirmation email
    try {
      const { sendEmail } = await import("@/lib/resend");
      await sendEmail(
        payerEmail,
        "Your ICT Trading Starter Kit Access",
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0d2137;padding:32px;text-align:center;border-radius:8px 8px 0 0;">
            <h1 style="color:#c9a84c;margin:0;font-size:28px;">Welcome to the Starter Kit!</h1>
          </div>
          <div style="padding:32px;background:#f9f9f9;border-radius:0 0 8px 8px;">
            <p style="color:#333;font-size:16px;">Hey ${payerName || "there"},</p>
            <p style="color:#555;">Your ICT Trading Starter Kit is ready. Click below to access all 5 modules instantly.</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="https://r2ftrading.com/starter-kit/access?token=${token}" style="display:inline-block;background:#c9a84c;color:#0d2137;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Access Your Course</a>
            </div>
            <div style="background:white;padding:20px;border-radius:8px;border:1px solid #e5e5e5;margin:20px 0;">
              <p style="margin:0 0 8px;color:#333;"><strong>What you get:</strong></p>
              <ul style="color:#555;margin:0;padding-left:20px;">
                <li>5 modules with 18 lessons</li>
                <li>ICT Trading Checklist (PDF download)</li>
                <li>Private Telegram community access</li>
                <li>30-day email support</li>
              </ul>
            </div>
            <p style="color:#555;">Join our Telegram community: <a href="https://t.me/Road2Funded">t.me/Road2Funded</a></p>
            <p style="color:#888;font-size:12px;margin-top:24px;text-align:center;">Questions? Reply to this email or message us on WhatsApp: wa.me/66935754757</p>
          </div>
        </div>`
      );
    } catch {}

    // Notify Harvest via email
    try {
      const { sendEmail } = await import("@/lib/resend");
      await sendEmail(
        "road2funded@gmail.com",
        `New Starter Kit Sale: $49 from ${payerEmail}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;">
          <h2 style="color:#0d2137;">New Starter Kit Purchase!</h2>
          <div style="background:#f0fff0;padding:20px;border-radius:8px;border:1px solid #90ee90;">
            <p style="margin:0 0 8px;"><strong>Product:</strong> ICT Trading Starter Kit</p>
            <p style="margin:0 0 8px;"><strong>Amount:</strong> $49 USD</p>
            <p style="margin:0 0 8px;"><strong>Email:</strong> ${payerEmail}</p>
            <p style="margin:0 0 8px;"><strong>Name:</strong> ${payerName || "N/A"}</p>
            <p style="margin:0;"><strong>PayPal Order:</strong> ${orderId}</p>
          </div>
        </div>`
      );
    } catch {}

    // Notify via Telegram
    try {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
      if (tgToken && chatId) {
        await fetch(
          `https://api.telegram.org/bot${tgToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `💰 *STARTER KIT SALE*\n\nProduct: ICT Trading Starter Kit\nAmount: $49\nEmail: ${payerEmail}\nName: ${payerName || "N/A"}\nOrder: ${orderId}`,
              parse_mode: "Markdown",
            }),
          }
        );
      }
    } catch {}

    return NextResponse.json({ success: true, token });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
