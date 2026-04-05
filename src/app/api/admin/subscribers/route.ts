import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const raw = await readFile("data/subscribers.json");
    const subscribers = JSON.parse(raw);
    // Sort newest first
    subscribers.sort((a: { date: string }, b: { date: string }) => (a.date > b.date ? -1 : 1));
    return NextResponse.json({ subscribers });
  } catch {
    return NextResponse.json({ subscribers: [] });
  }
}
