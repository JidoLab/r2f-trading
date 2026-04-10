"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RevenueData {
  totalRevenue: number;
  thisMonth: number;
  thisWeek: number;
  avgDealSize: number;
  monthlyRevenue: { month: string; amount: number }[];
  byPlan: { lite: number; pro: number; full: number };
  conversionRate: number;
  totalSubscribers: number;
  totalPayments: number;
  recentPayments: {
    email?: string;
    plan?: string;
    amount?: string;
    date?: string;
    status?: string;
  }[];
}

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/revenue")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function formatDate(dateStr?: string) {
    if (!dateStr) return "\u2014";
    try {
      return new Date(dateStr).toLocaleString("en-GB", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  function formatCurrency(n: number) {
    return "$" + n.toLocaleString();
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Revenue Tracker</h1>
        <p className="text-white/40">Loading revenue data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Revenue Tracker</h1>
        <p className="text-white/40">Failed to load revenue data.</p>
      </div>
    );
  }

  const maxMonthly = Math.max(...data.monthlyRevenue.map((m) => m.amount), 1);
  const planTotal = data.byPlan.lite + data.byPlan.pro + data.byPlan.full;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue Tracker</h1>
          <p className="text-white/50 text-sm mb-0">
            Financial overview of coaching revenue.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          &larr; Dashboard
        </Link>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">
            All-Time Revenue
          </p>
          <p className="text-3xl font-black text-gold">
            {formatCurrency(data.totalRevenue)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">
            This Month
          </p>
          <p className="text-3xl font-black text-white">
            {formatCurrency(data.thisMonth)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">
            This Week
          </p>
          <p className="text-3xl font-black text-white">
            {formatCurrency(data.thisWeek)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">
            Avg Deal Size
          </p>
          <p className="text-3xl font-black text-white">
            {formatCurrency(data.avgDealSize)}
          </p>
        </div>
      </div>

      {/* Monthly Revenue Chart + Plan Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white text-sm font-semibold mb-4">
            Monthly Revenue (Last 6 Months)
          </h2>
          <div className="flex items-end gap-3 h-48">
            {data.monthlyRevenue.map((m) => {
              const pct = maxMonthly > 0 ? (m.amount / maxMonthly) * 100 : 0;
              return (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center justify-end h-full"
                >
                  <span className="text-white/60 text-xs mb-1">
                    {m.amount > 0 ? formatCurrency(m.amount) : ""}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gold/80 transition-all"
                    style={{
                      height: `${Math.max(pct, 2)}%`,
                      minHeight: "4px",
                    }}
                  />
                  <span className="text-white/40 text-[10px] mt-2 uppercase tracking-wider">
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan Breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white text-sm font-semibold mb-4">
            Revenue by Plan
          </h2>
          <div className="space-y-4">
            {[
              {
                label: "Lite ($150/wk)",
                value: data.byPlan.lite,
                color: "bg-blue-400",
              },
              {
                label: "Pro ($200/wk)",
                value: data.byPlan.pro,
                color: "bg-yellow-400",
              },
              {
                label: "Full Mentorship",
                value: data.byPlan.full,
                color: "bg-green-400",
              },
            ].map((plan) => {
              const pct = planTotal > 0 ? (plan.value / planTotal) * 100 : 0;
              return (
                <div key={plan.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">{plan.label}</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(plan.value)}{" "}
                      <span className="text-white/30">
                        ({Math.round(pct)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${plan.color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-white/40 text-xs mb-1">Total from plans</p>
            <p className="text-xl font-bold text-white">
              {formatCurrency(planTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* Conversion Rate */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
        <h2 className="text-white text-sm font-semibold mb-3">
          Conversion Rate
        </h2>
        <div className="flex items-center gap-8">
          <div>
            <p className="text-white/40 text-xs mb-1">Total Subscribers</p>
            <p className="text-2xl font-black text-white">
              {data.totalSubscribers}
            </p>
          </div>
          <div className="text-white/20 text-2xl">&rarr;</div>
          <div>
            <p className="text-white/40 text-xs mb-1">Total Payments</p>
            <p className="text-2xl font-black text-white">
              {data.totalPayments}
            </p>
          </div>
          <div className="text-white/20 text-2xl">=</div>
          <div>
            <p className="text-white/40 text-xs mb-1">Conversion</p>
            <p className="text-2xl font-black text-gold">
              {data.conversionRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-white text-sm font-semibold">
            Recent Transactions (Last 20)
          </h2>
        </div>
        {data.recentPayments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-white/40 text-sm">No payments recorded yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">
                  Payer
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recentPayments.map((p, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4 text-white/60 text-sm">
                    {formatDate(p.date)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gold text-sm font-semibold">
                      {p.plan || "\u2014"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-bold text-sm">
                    {p.amount || "\u2014"}
                  </td>
                  <td className="px-6 py-4 text-white/70 text-sm">
                    {p.email || "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
