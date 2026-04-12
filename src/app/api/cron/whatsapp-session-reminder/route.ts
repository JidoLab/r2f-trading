import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "@/lib/whatsapp";

export const maxDuration = 30;

interface Student {
  email: string;
  name?: string;
  phone?: string;
  lastWeeklyCheckIn?: string;
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ skipped: true, reason: "WhatsApp not configured" });
  }

  // Only send on Fridays
  const now = new Date();
  if (now.getUTCDay() !== 5) {
    return NextResponse.json({ skipped: true, reason: "Not Friday" });
  }

  try {
    let students: Student[] = [];
    try {
      students = JSON.parse(await readFile("data/students.json"));
    } catch {
      return NextResponse.json({ skipped: true, reason: "No students file" });
    }

    let messagesSent = 0;
    let updated = false;

    // Current week identifier (ISO week start date) to avoid duplicate sends
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - now.getUTCDay());
    weekStart.setUTCHours(0, 0, 0, 0);
    const currentWeekKey = weekStart.toISOString().split("T")[0];

    for (const student of students) {
      if (!student.phone) continue;

      // Skip if already sent this week
      if (student.lastWeeklyCheckIn) {
        const lastSent = new Date(student.lastWeeklyCheckIn);
        const lastSentWeekStart = new Date(lastSent);
        lastSentWeekStart.setUTCDate(lastSent.getUTCDate() - lastSent.getUTCDay());
        lastSentWeekStart.setUTCHours(0, 0, 0, 0);
        if (lastSentWeekStart.toISOString().split("T")[0] === currentWeekKey) {
          continue;
        }
      }

      const displayName = student.name || student.email.split("@")[0];
      try {
        await sendWhatsAppMessage(
          student.phone,
          `Hey ${displayName}, how did your trading week go? Any setups you want to review in our next session? 📊`
        );
        student.lastWeeklyCheckIn = now.toISOString();
        messagesSent++;
        updated = true;
      } catch {}
    }

    if (updated) {
      await commitFile(
        "data/students.json",
        JSON.stringify(students, null, 2),
        `Weekly WhatsApp check-in: sent ${messagesSent} messages`
      );
    }

    return NextResponse.json({ success: true, messagesSent });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
