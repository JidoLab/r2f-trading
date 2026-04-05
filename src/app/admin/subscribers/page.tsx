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
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  function loadSubscribers() {
    fetch("/api/admin/subscribers")
      .then((r) => r.json())
      .then((data) => {
        setSubscribers(data.subscribers || []);
        setLoading(false);
      });
  }

  useEffect(() => { loadSubscribers(); }, []);

  async function handleAdd() {
    if (!newEmail || !newEmail.includes("@")) return;
    setAdding(true);

    const res = await fetch("/api/admin/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail }),
    });

    if (res.ok) {
      setNewEmail("");
      loadSubscribers();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Failed to add: ${data.error || "Unknown error"}`);
    }
    setAdding(false);
  }

  async function handleRemove(email: string) {
    if (!confirm(`Remove ${email} from the list?`)) return;
    setRemoving(email);

    const res = await fetch("/api/admin/subscribers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setSubscribers((prev) => prev.filter((s) => s.email !== email));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Failed to remove: ${data.error || "Unknown error"}`);
    }
    setRemoving(null);
  }

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

      {/* Add Subscriber */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-5 mb-6">
        <h3 className="text-white text-sm font-semibold mb-3">Add Subscriber Manually</h3>
        <p className="text-white/40 text-xs mb-3">They will receive the welcome email with PDF immediately and start the drip sequence in 1 hour.</p>
        <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="flex gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@example.com"
            required
            className="flex-1 px-4 py-2.5 rounded-md bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold"
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-2.5 rounded-md transition-all disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </form>
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
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider text-right">Actions</th>
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
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleRemove(sub.email)}
                      disabled={removing === sub.email}
                      className="text-red-400/50 hover:text-red-400 text-xs transition-colors disabled:opacity-50"
                    >
                      {removing === sub.email ? "Removing..." : "Remove"}
                    </button>
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
