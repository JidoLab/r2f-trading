import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getAnalyticsData, isAnalyticsConfigured } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configured = isAnalyticsConfigured();

  if (!configured) {
    return NextResponse.json({
      configured: false,
      overview7d: null,
      overview30d: null,
      dailyMetrics: [],
      topPages: [],
      trafficSources: [],
    });
  }

  try {
    const data = await getAnalyticsData();

    if (!data) {
      return NextResponse.json({
        configured: true,
        error: "Failed to fetch analytics data. Check service account permissions.",
        overview7d: null,
        overview30d: null,
        dailyMetrics: [],
        topPages: [],
        trafficSources: [],
      });
    }

    return NextResponse.json({
      configured: true,
      ...data,
    });
  } catch (err) {
    console.error("[analytics route]", err);
    return NextResponse.json({
      configured: true,
      error: "Internal error fetching analytics",
      overview7d: null,
      overview30d: null,
      dailyMetrics: [],
      topPages: [],
      trafficSources: [],
    });
  }
}
