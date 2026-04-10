import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile } from "@/lib/github";
import { normalizeSubscriber } from "@/lib/lead-scoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let subscribers: Record<string, unknown>[] = [];
    try {
      const raw = await readFile("data/subscribers.json");
      subscribers = JSON.parse(raw);
    } catch {
      return NextResponse.json({ hotLeads: [] });
    }

    const now = Date.now();
    const hotLeads = subscribers
      .map((sub) => {
        const scored = normalizeSubscriber(sub);
        if (scored.segment !== "hot") return null;

        const daysSinceSignup = Math.floor(
          (now - new Date(scored.date).getTime()) / 86400000
        );

        return {
          email: scored.email,
          name: (sub.name as string) || scored.email.split("@")[0],
          score: scored.score,
          segment: scored.segment,
          date: scored.date,
          daysSinceSignup,
          lastActivity: scored.lastActivity,
          events: scored.events,
          hotFollowUpSent: (sub.hotFollowUpSent as boolean) || false,
          dripsSent: scored.dripsSent,
          dripsHistory: scored.dripsHistory,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b!.score - a!.score));

    return NextResponse.json({ hotLeads, total: hotLeads.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch hot leads";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
