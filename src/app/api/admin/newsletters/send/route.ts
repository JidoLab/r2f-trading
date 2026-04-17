import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { sendWeeklyNewsletter } from "@/lib/newsletter-sender";
import { sendTelegramReport } from "@/lib/telegram-report";

export const maxDuration = 120;

/**
 * Admin "Send Now" button → sends the weekly newsletter immediately.
 * Calls the shared sendWeeklyNewsletter() function directly — no HTTP hop,
 * no CRON_SECRET exposure, no VERCEL_URL pitfalls.
 */
export async function POST() {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendWeeklyNewsletter();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Newsletter failed";
    console.error("[admin-newsletter] Error:", msg);
    try {
      await sendTelegramReport(`*Admin Newsletter Send Failed*\nError: ${msg}`);
    } catch { /* best effort */ }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
