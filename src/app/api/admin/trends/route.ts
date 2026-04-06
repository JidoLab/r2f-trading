import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getUpcomingEvents, getTrendingTopics, getWeeklyContext } from "@/lib/market-trends";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [events, trending] = await Promise.all([
      Promise.resolve(getUpcomingEvents(14)),
      getTrendingTopics(),
    ]);
    const weeklyContext = getWeeklyContext();

    return NextResponse.json({
      weeklyContext,
      events,
      trending,
      date: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
