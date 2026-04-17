import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export const maxDuration = 120;

/**
 * Admin-authenticated proxy to the send-newsletter cron endpoint.
 * Avoids exposing CRON_SECRET to the browser — admin session cookie suffices.
 */
export async function POST() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on server" },
      { status: 500 },
    );
  }

  // Construct absolute URL for internal call (required by fetch in edge runtimes)
  const base =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://www.r2ftrading.com";

  try {
    const res = await fetch(`${base}/api/cron/send-newsletter`, {
      method: "GET",
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to trigger newsletter" },
      { status: 500 },
    );
  }
}
