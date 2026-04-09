"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Payment {
  email?: string;
  plan?: string;
  amount?: string;
  date?: string;
  status?: string;
}

interface PaymentsData {
  payments: Payment[];
  total: number;
  revenue: number;
}

export default function AdminPaymentsPage() {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/payments")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("en-GB", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-white/50 text-sm mb-0">Payment history from coaching plans.</p>
        </div>
        <Link
          href="/admin"
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Total Revenue</p>
          <p className="text-3xl font-black text-gold">${data?.revenue?.toLocaleString() || "0"}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Total Payments</p>
          <p className="text-3xl font-black text-white">{data?.total || 0}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Avg Payment</p>
          <p className="text-3xl font-black text-white">
            ${data && data.total > 0 ? Math.round(data.revenue / data.total).toLocaleString() : "0"}
          </p>
        </div>
      </div>

      {/* Payments Table */}
      {loading ? (
        <p className="text-white/40">Loading payments...</p>
      ) : !data || data.payments.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
          <p className="text-white/40 text-sm">No payments recorded yet.</p>
          <p className="text-white/20 text-xs mt-2">Payments will appear here once data/payments.json is created in GitHub.</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Payer</th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((payment, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-white/60 text-sm">{formatDate(payment.date)}</td>
                  <td className="px-6 py-4">
                    <span className="text-gold text-sm font-semibold">{payment.plan || "—"}</span>
                  </td>
                  <td className="px-6 py-4 text-white font-bold text-sm">{payment.amount || "—"}</td>
                  <td className="px-6 py-4 text-white/70 text-sm">{payment.email || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                      payment.status === "completed"
                        ? "bg-green-500/10 text-green-400"
                        : payment.status === "pending"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : payment.status === "refunded"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-white/5 text-white/30"
                    }`}>
                      {payment.status || "completed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
