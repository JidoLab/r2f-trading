import { NextRequest, NextResponse } from "next/server";
import { sendEmail, addToAudience } from "@/lib/resend";
import { welcomeEmail } from "@/lib/email-templates";
import { commitFile, readFile } from "@/lib/github";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Add to Resend audience
    await addToAudience(email);

    // Send welcome email with PDF attachment
    const { subject, html } = welcomeEmail();
    let pdfBuffer: Buffer | undefined;

    try {
      // Try local file first (dev), then fetch from public URL
      const localPath = path.join(process.cwd(), "public", "downloads", "ict-trading-checklist.pdf");
      if (fs.existsSync(localPath)) {
        pdfBuffer = fs.readFileSync(localPath);
      } else {
        const res = await fetch("https://r2ftrading.com/downloads/ict-trading-checklist.pdf");
        if (res.ok) {
          pdfBuffer = Buffer.from(await res.arrayBuffer());
        }
      }
    } catch { /* send without attachment if PDF unavailable */ }

    await sendEmail(
      email,
      subject,
      html,
      pdfBuffer ? [{ filename: "ICT-Trading-Checklist.pdf", content: pdfBuffer }] : undefined
    );

    // Store subscriber in GitHub for drip tracking
    try {
      let subscribers: { email: string; date: string; dripsSent: number }[] = [];
      try {
        const raw = await readFile("data/subscribers.json");
        subscribers = JSON.parse(raw);
      } catch { /* file doesn't exist yet */ }

      // Check for duplicate
      if (!subscribers.some((s) => s.email === email)) {
        subscribers.push({ email, date: new Date().toISOString(), dripsSent: 0 });
        await commitFile(
          "data/subscribers.json",
          JSON.stringify(subscribers, null, 2),
          `New subscriber: ${email.replace(/@.*/, "@***")}`
        );
      }
    } catch { /* GitHub storage is best-effort */ }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Subscription failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
