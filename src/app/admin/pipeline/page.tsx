"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FunnelData {
  subscribers: number;
  cold: number;
  warm: number;
  hot: number;
  booked: number;
  paid: number;
}

interface HotLead {
  email: string;
  score: number;
  segment: string;
  date: string;
  lastEvent: string;
  daysSinceSignup: number;
  isPaid: boolean;
}

interface PipelineData {
  funnel: FunnelData;
  hotLeads: HotLead[];
}

export default function AdminPipelinePage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/pipeline")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Lead Pipeline</h1>
        <p className="text-white/40">Loading pipeline data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Lead Pipeline</h1>
        <p className="text-white/40">Failed to load pipeline data.</p>
      </div>
    );
  }

  const { funnel, hotLeads } = data;

  // Max for funnel bar widths — subscribers is always the widest
  const funnelMax = Math.max(funnel.subscribers, 1);

  const stages: {
    label: string;
    count: number;
    color: string;
    bgColor: string;
    note?: string;
  }[] = [
    {
      label: "Site Visitors",
      count: 0,
      color: "text-white/40",
      bgColor: "bg-white/10",
      note: "See Analytics",
    },
    {
      label: "Total Subscribers",
      count: funnel.subscribers,
      color: "text-white",
      bgColor: "bg-white/20",
    },
    {
      label: "Cold Leads (0\u201319)",
      count: funnel.cold,
      color: "text-blue-400",
      bgColor: "bg-blue-500/40",
    },
    {
      label: "Warm Leads (20\u201349)",
      count: funnel.warm,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/40",
    },
    {
      label: "Hot Leads (50+)",
      count: funnel.hot,
      color: "text-red-400",
      bgColor: "bg-red-500/40",
    },
    {
      label: "Booked Calls",
      count: funnel.booked,
      color: "text-orange-400",
      bgColor: "bg-orange-500/40",
    },
    {
      label: "Paid Students",
      count: funnel.paid,
      color: "text-green-400",
      bgColor: "bg-green-500/40",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Lead Pipeline</h1>
          <p className="text-white/50 text-sm mb-0">
            Visual funnel from visitor to paid student.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          &larr; Dashboard
        </Link>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
        <h2 className="text-white text-sm font-semibold mb-6">
          Conversion Funnel
        </h2>
        <div className="space-y-3">
          {stages.map((stage) => {
            const widthPct =
              stage.note
                ? 100
                : funnelMax > 0
                ? Math.max((stage.count / funnelMax) * 100, 4)
                : 4;
            return (
              <div key={stage.label} className="flex items-center gap-4">
                <div className="w-40 shrink-0 text-right">
                  <span className={`text-xs font-semibold ${stage.color}`}>
                    {stage.label}
                  </span>
                </div>
                <div className="flex-1 relative">
                  <div
                    className={`${stage.bgColor} rounded h-8 flex items-center px-3 transition-all`}
                    style={{ width: `${widthPct}%` }}
                  >
                    {stage.note ? (
                      <a
                        href="https://vercel.com/wrightharvest-9811s-projects/r2f-trading/analytics"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/50 text-xs hover:text-white transition-colors"
                      >
                        See Analytics &rarr;
                      </a>
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {stage.count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            Cold
          </p>
          <p className="text-2xl font-black text-white">{funnel.cold}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">
            Warm
          </p>
          <p className="text-2xl font-black text-white">{funnel.warm}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
            Hot
          </p>
          <p className="text-2xl font-black text-white">{funnel.hot}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">
            Booked
          </p>
          <p className="text-2xl font-black text-white">{funnel.booked}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-1">
            Paid
          </p>
          <p className="text-2xl font-black text-gold">{funnel.paid}</p>
        </div>
      </div>

      {/* Hot Leads Table */}
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-white text-sm font-semibold">
            Hot Leads ({hotLeads.length})
          </h2>
          <p className="text-white/30 text-xs mt-1">
            Subscribers with score 50+ sorted by highest score.
          </p>
        </div>
        {hotLeads.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-white/40 text-sm">No hot leads yet.</p>
            <p className="text-white/20 text-xs mt-2">
              Leads become hot when their engagement score reaches 50+.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">
                  Days Since Signup
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {hotLeads.map((lead) => (
                <tr
                  key={lead.email}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4 text-white/90 text-sm">
                    {lead.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-red-400 font-bold text-sm">
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/60 text-sm">
                    {lead.lastEvent}
                  </td>
                  <td className="px-6 py-4 text-white/60 text-sm">
                    {lead.daysSinceSignup}d ago
                  </td>
                  <td className="px-6 py-4">
                    {lead.isPaid ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-green-500/10 text-green-400">
                        Paid
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-red-500/10 text-red-400">
                        Unpaid
                      </span>
                    )}
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
