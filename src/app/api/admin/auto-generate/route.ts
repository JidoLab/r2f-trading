import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { commitFile, readFile } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const raw = await readFile("config/auto-generate.json");
    const config = JSON.parse(raw);
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { enabled } = await req.json();
  const config = JSON.stringify({ enabled: !!enabled }, null, 2);

  try {
    await commitFile(
      "config/auto-generate.json",
      config,
      enabled ? "Enable auto blog generation" : "Disable auto blog generation"
    );
    return NextResponse.json({ enabled: !!enabled });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
