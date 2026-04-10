import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile } from "@/lib/github";
import type { ScoredSubscriber } from "@/lib/lead-scoring";

export const dynamic = "force-dynamic";

interface Payment {
  email?: string;
  plan?: string;
  amount?: string;
  date?: string;
  status?: string;
}

function parseAmount(amount?: string): number {
  if (!amount) return 0;
  return parseFloat(String(amount).replace(/[^0-9.]/g, "")) || 0;
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payments: Payment[] = [];
  let subscribers: ScoredSubscriber[] = [];

  try {
    const raw = await readFile("data/payments.json");
    payments = JSON.parse(raw);
  } catch {
    // no payments yet
  }

  try {
    const raw = await readFile("data/subscribers.json");
    subscribers = JSON.parse(raw);
  } catch {
    // no subscribers yet
  }

  // Sort by date descending
  payments.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const now = new Date();
  const thisMonthKey = getMonthKey(now.toISOString());
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  let totalRevenue = 0;
  let thisMonth = 0;
  let thisWeek = 0;
  const byPlan: Record<string, number> = { lite: 0, pro: 0, full: 0 };
  const monthlyMap: Record<string, number> = {};

  for (const p of payments) {
    const amt = parseAmount(p.amount);
    totalRevenue += amt;

    if (p.date) {
      const mk = getMonthKey(p.date);
      if (mk === thisMonthKey) thisMonth += amt;
      if (new Date(p.date) >= weekAgo) thisWeek += amt;
      monthlyMap[mk] = (monthlyMap[mk] || 0) + amt;
    }

    const planLower = (p.plan || "").toLowerCase();
    if (planLower.includes("full") || planLower.includes("mentorship")) {
      byPlan.full += amt;
    } else if (planLower.includes("pro")) {
      byPlan.pro += amt;
    } else {
      byPlan.lite += amt;
    }
  }

  // Build last 6 months of revenue
  const monthlyRevenue: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = getMonthKey(d.toISOString());
    monthlyRevenue.push({
      month: getMonthLabel(key),
      amount: monthlyMap[key] || 0,
    });
  }

  const avgDealSize = payments.length > 0 ? Math.round(totalRevenue / payments.length) : 0;
  const conversionRate = subscribers.length > 0
    ? Math.round((payments.length / subscribers.length) * 10000) / 100
    : 0;

  const recentPayments = payments.slice(0, 20);

  return NextResponse.json({
    totalRevenue,
    thisMonth,
    thisWeek,
    avgDealSize,
    monthlyRevenue,
    byPlan,
    conversionRate,
    totalSubscribers: subscribers.length,
    totalPayments: payments.length,
    recentPayments,
  });
}
