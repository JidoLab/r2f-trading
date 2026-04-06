import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { commitFile, readFile } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const raw = await readFile("config/auto-generate-shorts.json");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { enabled } = await req.json();
  try {
    await commitFile("config/auto-generate-shorts.json", JSON.stringify({ enabled: !!enabled }, null, 2), enabled ? "Enable auto Shorts" : "Disable auto Shorts");
    return NextResponse.json({ enabled: !!enabled });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
