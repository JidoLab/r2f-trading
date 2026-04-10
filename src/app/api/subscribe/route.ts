import { NextRequest, NextResponse } from "next/server";
import { sendEmail, addToAudience } from "@/lib/resend";
import { welcomeEmail, referralBonusEmail, friendJoinedEmail } from "@/lib/email-templates";
import { commitFile, readFile } from "@/lib/github";
import fs from "fs";
import path from "path";
import crypto from "crypto";

interface Subscriber {
  email: string;
  date: string;
  dripsSent: number;
  score?: number;
  segment?: string;
  events?: { type: string; date: string }[];
  lastActivity?: string;
  dripsHistory?: string[];
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
}

function generateReferralCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `R2F-${code}`;
}

export async function POST(req: NextRequest) {
  try {
    const { email, name, ref } = await req.json();

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
    let referralCode = "";
    try {
      let subscribers: Subscriber[] = [];
      try {
        const raw = await readFile("data/subscribers.json");
        subscribers = JSON.parse(raw);
      } catch { /* file doesn't exist yet */ }

      // Check for duplicate
      const existing = subscribers.find((s) => s.email === email);
      if (!existing) {
        referralCode = generateReferralCode();

        // Ensure code is unique
        while (subscribers.some((s) => s.referralCode === referralCode)) {
          referralCode = generateReferralCode();
        }

        const newSub: Subscriber = {
          email,
          date: new Date().toISOString(),
          dripsSent: 0,
          referralCode,
          referredBy: ref || null,
          referralCount: 0,
        };
        subscribers.push(newSub);

        // If referred, credit the referrer
        if (ref) {
          const referrer = subscribers.find((s) => s.referralCode === ref);
          if (referrer) {
            referrer.referralCount = (referrer.referralCount || 0) + 1;

            // Send "friend joined" email to referrer
            const friendDisplayName = name || email.split("@")[0];
            const { subject: fjSubject, html: fjHtml } = friendJoinedEmail(
              referrer.email.split("@")[0],
              friendDisplayName
            );
            sendEmail(referrer.email, fjSubject, fjHtml).catch(() => {});
          }
        }

        await commitFile(
          "data/subscribers.json",
          JSON.stringify(subscribers, null, 2),
          `New subscriber: ${email.replace(/@.*/, "@***")}${ref ? ` (ref: ${ref})` : ""}`
        );
      } else {
        referralCode = existing.referralCode || generateReferralCode();
        // Backfill referral code if missing
        if (!existing.referralCode) {
          existing.referralCode = referralCode;
          await commitFile(
            "data/subscribers.json",
            JSON.stringify(subscribers, null, 2),
            `Backfill referral code for ${email.replace(/@.*/, "@***")}`
          );
        }
      }
    } catch { /* GitHub storage is best-effort */ }

    // Send referral bonus email with their unique link
    if (referralCode) {
      const referralLink = `https://r2ftrading.com/refer?ref=${referralCode}`;
      const displayName = name || email.split("@")[0];
      const { subject: refSubject, html: refHtml } = referralBonusEmail(displayName, referralLink);
      sendEmail(email, refSubject, refHtml).catch(() => {});
    }

    return NextResponse.json({ success: true, referralCode });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Subscription failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
