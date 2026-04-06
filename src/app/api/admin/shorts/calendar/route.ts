import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const raw = await readFile("data/shorts/calendar.json");
    return NextResponse.json({ calendar: JSON.parse(raw) });
  } catch {
    return NextResponse.json({ calendar: [] });
  }
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { generateContentCalendar } = await import("@/lib/content-calendar");
    await generateContentCalendar(30);
    return NextResponse.json({ success: true, message: "30-day calendar generated" });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
