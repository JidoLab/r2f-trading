import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { sendEmail } from "@/lib/resend";
import {
  sessionPrepEmail,
  checkInEmail,
  weekOneEmail,
  milestoneEmail,
} from "@/lib/email-templates";

export const maxDuration = 60;

// Onboarding schedule: [daysSinceStart, emailKey, templateFn]
const ONBOARDING_SCHEDULE: [number, string, (name: string) => { subject: string; html: string }][] = [
  [1, "sessionPrep", sessionPrepEmail],
  [3, "checkIn", checkInEmail],
  [7, "weekOne", weekOneEmail],
  // Day 14 review request is handled by send-drips cron — skip here
  [30, "milestone", milestoneEmail],
];

interface StudentRecord {
  email: string;
  name: string;
  plan: string;
  amount: number;
  orderId: string;
  startDate: string;
  onboardingStep: number;
  onboardingEmails: string[];
  nextCheckIn: string;
  reviewRequested: boolean;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let students: StudentRecord[] = [];
    try {
      const raw = await readFile("data/students.json");
      students = JSON.parse(raw);
    } catch {
      return NextResponse.json({ sent: 0, message: "No students yet" });
    }

    const now = Date.now();
    let emailsSent = 0;
    let updated = false;

    for (let i = 0; i < students.length; i++) {
      if (emailsSent >= 50) break; // Rate limit per run

      const student = students[i];
      const daysSinceStart = Math.floor(
        (now - new Date(student.startDate).getTime()) / 86400000
      );
      const sentEmails = student.onboardingEmails || [];

      // Find the next email this student should receive
      for (const [day, emailKey, templateFn] of ONBOARDING_SCHEDULE) {
        if (daysSinceStart < day) continue;
        if (sentEmails.includes(emailKey)) continue;

        // Skip day-14 review if already handled by drip system
        if (emailKey === "milestone" && student.reviewRequested) {
          // Don't skip milestone — reviewRequested is separate
        }

        try {
          const studentName = student.name || student.email.split("@")[0];
          const { subject, html } = templateFn(studentName);
          await sendEmail(student.email, subject, html);

          student.onboardingEmails = [...sentEmails, emailKey];
          student.onboardingStep = student.onboardingEmails.length;

          // Set next check-in to the next scheduled email
          const nextEmail = ONBOARDING_SCHEDULE.find(
            ([d, key]) => d > day && !student.onboardingEmails.includes(key)
          );
          if (nextEmail) {
            const nextDate = new Date(student.startDate);
            nextDate.setDate(nextDate.getDate() + nextEmail[0]);
            student.nextCheckIn = nextDate.toISOString();
          }

          students[i] = student;
          emailsSent++;
          updated = true;
          break; // Only send ONE email per student per run
        } catch {
          // Skip failed sends, will retry next run
        }
      }
    }

    if (updated) {
      await commitFile(
        "data/students.json",
        JSON.stringify(students, null, 2),
        `Student onboarding: sent ${emailsSent} emails`
      );
    }

    return NextResponse.json({
      sent: emailsSent,
      total: students.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Student onboarding failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
