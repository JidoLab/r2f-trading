"use client";

import { useEffect, useState } from "react";

interface Subscriber {
  email: string;
  date: string;
  dripsSent: number;
}

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/subscribers")
      .then((r) => r.json())
      .then((data) => {
        setSubscribers(data.subscribers || []);
        setLoading(false);
      });
  }, []);

  const totalSubs = subscribers.length;
  const last7Days = subscribers.filter(
    (s) => new Date(s.date) > new Date(Date.now() - 7 * 86400000)
  ).length;
  const completedDrip = subscribers.filter((s) => s.dripsSent >= 4).length;
  const inDrip = subscribers.filter((s) => s.dripsSent > 0 && s.dripsSent < 4).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Subscribers</h1>
      <p className="text-white/50 text-sm mb-8">Email list from lead magnet signups.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs mb-1">Total</p>
          <p className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>{totalSubs}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs mb-1">Last 7 Days</p>
          <p className="text-2xl font-black text-gold" style={{ fontFamily: "var(--font-heading)" }}>{last7Days}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs mb-1">In Drip Sequence</p>
          <p className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>{inDrip}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs mb-1">Completed Drip</p>
          <p className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>{completedDrip}</p>
        </div>
      </div>

      {/* Subscriber List */}
      {loading ? (
        <p className="text-white/40">Loading...</p>
      ) : subscribers.length === 0 ? (
        <p className="text-white/40">No subscribers yet.</p>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Signed Up</th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Drip Status</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((sub) => (
                <tr key={sub.email} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-white/90 text-sm">{sub.email}</td>
                  <td className="px-6 py-4 text-white/50 text-sm">
                    {new Date(sub.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                      sub.dripsSent >= 4
                        ? "bg-green-500/10 text-green-400"
                        : sub.dripsSent > 0
                        ? "bg-gold/10 text-gold"
                        : "bg-white/5 text-white/30"
                    }`}>
                      {sub.dripsSent >= 4 ? "Completed" : sub.dripsSent > 0 ? `Drip ${sub.dripsSent}/4` : "Welcome sent"}
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
