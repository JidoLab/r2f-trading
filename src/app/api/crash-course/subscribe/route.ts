import { NextRequest, NextResponse } from "next/server";
import { sendEmail, addToAudience } from "@/lib/resend";
import { crashCourseDay1 } from "@/lib/email-templates";
import { commitFile, readFile } from "@/lib/github";

interface CrashCourseSubscriber {
  email: string;
  name: string;
  date: string;
  day: number;
  emailsSent: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const displayName = name || email.split("@")[0];

    // Add to Resend audience
    await addToAudience(email).catch(() => {});

    // Load existing subscribers
    let subscribers: CrashCourseSubscriber[] = [];
    try {
      const raw = await readFile("data/crash-course-subscribers.json");
      subscribers = JSON.parse(raw);
    } catch {
      // File doesn't exist yet — that's fine
    }

    // Check for duplicate
    const existing = subscribers.find((s) => s.email === email);
    if (existing) {
      return NextResponse.json({ success: true, message: "Already enrolled" });
    }

    // Send Day 1 email immediately
    const { subject, html } = crashCourseDay1(displayName);
    await sendEmail(email, subject, html);

    // Save subscriber
    const newSub: CrashCourseSubscriber = {
      email,
      name: displayName,
      date: new Date().toISOString(),
      day: 0,
      emailsSent: ["day1"],
    };
    subscribers.push(newSub);

    await commitFile(
      "data/crash-course-subscribers.json",
      JSON.stringify(subscribers, null, 2),
      `Crash course signup: ${email.replace(/@.*/, "@***")}`
    );

    // Telegram notification to Harvest
    try {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const tgChat = process.env.TELEGRAM_OWNER_CHAT_ID;
      if (tgToken && tgChat) {
        fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgChat,
            text: `\u{1F4DA} CRASH COURSE SIGNUP\n\n${displayName} just enrolled in the 5-Day ICT Crash Course!\nEmail: ${email}\n\nDay 1 has been sent automatically.`,
          }),
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Subscription failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
