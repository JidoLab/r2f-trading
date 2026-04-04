import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const raw = await readFile("data/social-log.json");
    const log = JSON.parse(raw);
    return NextResponse.json({ log });
  } catch {
    return NextResponse.json({ log: [] });
  }
}
