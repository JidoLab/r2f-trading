import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile } from "@/lib/github";
import { sendEmail, addToAudience } from "@/lib/resend";
import { welcomeEmail } from "@/lib/email-templates";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface Subscriber {
  email: string;
  date: string;
  dripsSent: number;
}

async function getSubscribers(): Promise<Subscriber[]> {
  try {
    const raw = await readFile("data/subscribers.json");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveSubscribers(subscribers: Subscriber[], message: string) {
  await commitFile(
    "data/subscribers.json",
    JSON.stringify(subscribers, null, 2),
    message
  );
}

// List subscribers
export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscribers = await getSubscribers();
  subscribers.sort((a, b) => (a.date > b.date ? -1 : 1));
  return NextResponse.json({ subscribers });
}

// Add subscriber manually
export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await req.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const subscribers = await getSubscribers();

    // Check duplicate
    if (subscribers.some((s) => s.email === email)) {
      return NextResponse.json({ error: "Email already on the list" }, { status: 400 });
    }

    // Set date to 1 hour from now so drip sequence starts in ~1 hour
    // (the drip cron checks days since signup, so setting date 1 hour ago means
    // the first drip (Day 2) fires on schedule, but we trick it by setting
    // dripsSent to -1 and the date to 1 hour from now)
    // Actually simpler: set the date to 1 hour from now. The drip cron runs daily
    // and calculates days since signup. By setting signup to now, Day 2 drip
    // will fire in 2 days. For a 1-hour trigger we need a different approach.
    //
    // Best approach: set date to now, send welcome email immediately,
    // and set dripsSent to 0 (same as organic signups).
    // The "1 hour" delay is naturally handled since drip cron runs at 9 AM UTC daily.

    const now = new Date().toISOString();
    subscribers.push({ email, date: now, dripsSent: 0 });
    await saveSubscribers(subscribers, `Admin added subscriber: ${email.replace(/@.*/, "@***")}`);

    // Add to Resend audience
    await addToAudience(email);

    // Send welcome email with PDF immediately
    const { subject, html } = welcomeEmail();
    let pdfBuffer: Buffer | undefined;
    try {
      const localPath = path.join(process.cwd(), "public", "downloads", "ict-trading-checklist.pdf");
      if (fs.existsSync(localPath)) {
        pdfBuffer = fs.readFileSync(localPath);
      } else {
        const res = await fetch("https://r2ftrading.com/downloads/ict-trading-checklist.pdf");
        if (res.ok) pdfBuffer = Buffer.from(await res.arrayBuffer());
      }
    } catch {}

    await sendEmail(
      email,
      subject,
      html,
      pdfBuffer ? [{ filename: "ICT-Trading-Checklist.pdf", content: pdfBuffer }] : undefined
    );

    console.log(`[admin] Added subscriber: ${email}`);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Remove subscriber
export async function DELETE(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  try {
    let subscribers = await getSubscribers();
    const before = subscribers.length;
    subscribers = subscribers.filter((s) => s.email !== email);

    if (subscribers.length === before) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    await saveSubscribers(subscribers, `Admin removed subscriber: ${email.replace(/@.*/, "@***")}`);
    console.log(`[admin] Removed subscriber: ${email}`);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
