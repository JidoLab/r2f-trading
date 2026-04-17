import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyNewsletter } from "@/lib/newsletter-sender";
import { sendTelegramReport } from "@/lib/telegram-report";

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendWeeklyNewsletter();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Newsletter failed";
    console.error("[newsletter] Error:", msg);
    try {
      await sendTelegramReport(`*Newsletter Failed*\nError: ${msg}`);
    } catch { /* best effort */ }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
