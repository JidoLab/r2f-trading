import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { commitFile } from "@/lib/github";

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { enabled } = await req.json();
    await commitFile(
      "config/auto-generate-shorts.json",
      JSON.stringify({ enabled: !!enabled }, null, 2),
      `Shorts automation ${enabled ? "enabled" : "disabled"}`
    );
    return NextResponse.json({ success: true, enabled: !!enabled });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
