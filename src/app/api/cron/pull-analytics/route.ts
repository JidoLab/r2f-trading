import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { pullYouTubeAnalytics } = await import("@/lib/youtube-analytics");
    await pullYouTubeAnalytics();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
    console.error("[cron] Analytics pull failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
