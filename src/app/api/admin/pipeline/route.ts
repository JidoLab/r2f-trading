import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile } from "@/lib/github";
import { normalizeSubscriber } from "@/lib/lead-scoring";
import type { ScoredSubscriber } from "@/lib/lead-scoring";

export const dynamic = "force-dynamic";

interface Payment {
  email?: string;
  plan?: string;
  amount?: string;
  date?: string;
  status?: string;
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let subscribers: ScoredSubscriber[] = [];
  let payments: Payment[] = [];

  try {
    const raw = await readFile("data/subscribers.json");
    const parsed = JSON.parse(raw);
    subscribers = parsed.map((s: Record<string, unknown>) => normalizeSubscriber(s));
  } catch {
    // no subscribers yet
  }

  try {
    const raw = await readFile("data/payments.json");
    payments = JSON.parse(raw);
  } catch {
    // no payments yet
  }

  const cold = subscribers.filter((s) => s.score < 20);
  const warm = subscribers.filter((s) => s.score >= 20 && s.score < 50);
  const hot = subscribers.filter((s) => s.score >= 50);

  // Booked = subscribers who have a contact_page_view or calendly_click event
  const booked = subscribers.filter((s) =>
    s.events.some((e) => e.type === "contact_page_view" || e.type === "calendly_click")
  );

  const paidEmails = new Set(payments.map((p) => p.email?.toLowerCase()).filter(Boolean));

  const funnel = {
    subscribers: subscribers.length,
    cold: cold.length,
    warm: warm.length,
    hot: hot.length,
    booked: booked.length,
    paid: paidEmails.size,
  };

  // Hot lead details
  const now = Date.now();
  const hotLeads = hot
    .map((s) => {
      const lastEvent = s.events.length > 0 ? s.events[s.events.length - 1] : null;
      const daysSinceSignup = Math.floor((now - new Date(s.date).getTime()) / 86400000);
      return {
        email: s.email,
        score: s.score,
        segment: s.segment,
        date: s.date,
        lastEvent: lastEvent ? `${lastEvent.type} (${new Date(lastEvent.date).toLocaleDateString()})` : "None",
        daysSinceSignup,
        isPaid: paidEmails.has(s.email.toLowerCase()),
      };
    })
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ funnel, hotLeads });
}
