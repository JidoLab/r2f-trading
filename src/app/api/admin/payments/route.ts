import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile } from "@/lib/github";

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

  let payments: Payment[] = [];
  try {
    const raw = await readFile("data/payments.json");
    payments = JSON.parse(raw);
  } catch {
    // File may not exist yet — return empty
    return NextResponse.json({ payments: [], total: 0, revenue: 0 });
  }

  // Sort by date descending (newest first)
  payments.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  let revenue = 0;
  for (const p of payments) {
    revenue += parseFloat(String(p.amount).replace(/[^0-9.]/g, "")) || 0;
  }

  return NextResponse.json({
    payments,
    total: payments.length,
    revenue,
  });
}
