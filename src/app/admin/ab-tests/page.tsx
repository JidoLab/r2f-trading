"use client";

import { useEffect, useState } from "react";

interface TemplateStats {
  name: string;
  displayName: string;
  sentCount: number;
  segments: string[];
  openRate: string;
  clickRate: string;
}

interface OverallStats {
  totalSent: number;
  avgPerSub: string;
  completedAll: number;
  inProgress: number;
  totalSubscribers: number;
}

interface ABTestData {
  templateStats: TemplateStats[];
  overallStats: OverallStats;
}

const SEGMENT_COLORS: Record<string, string> = {
  cold: "bg-blue-400/20 text-blue-300",
  warm: "bg-yellow-400/20 text-yellow-300",
  hot: "bg-red-400/20 text-red-300",
};

export default function ABTestsPage() {
  const [data, setData] = useState<ABTestData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ab-tests")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-white/50 text-sm">Loading drip campaign data...</div>;
  }

  if (!data) {
    return <p className="text-red-400 text-sm">Failed to load A/B test data.</p>;
  }

  const { templateStats, overallStats } = data;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">A/B Test Tracker</h1>
        <p className="text-white/40 text-sm mt-1">Drip campaign email performance</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Total Drips Sent</p>
          <p className="text-3xl font-black text-gold">{overallStats.totalSent}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Avg per Subscriber</p>
          <p className="text-3xl font-black text-white">{overallStats.avgPerSub}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Completed All</p>
          <p className="text-3xl font-black text-green-400">{overallStats.completedAll}</p>
          <p className="text-white/30 text-xs mt-1">of {overallStats.totalSubscribers} subscribers</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">In Progress</p>
          <p className="text-3xl font-black text-yellow-400">{overallStats.inProgress}</p>
          <p className="text-white/30 text-xs mt-1">still receiving drips</p>
        </div>
      </div>

      {/* Per-Template Stats Table */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4">Email Template Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/40 text-xs font-bold uppercase tracking-wider py-3 pr-4">Template</th>
                <th className="text-center text-white/40 text-xs font-bold uppercase tracking-wider py-3 px-4">Sent</th>
                <th className="text-center text-white/40 text-xs font-bold uppercase tracking-wider py-3 px-4">Open Rate</th>
                <th className="text-center text-white/40 text-xs font-bold uppercase tracking-wider py-3 px-4">Click Rate</th>
                <th className="text-left text-white/40 text-xs font-bold uppercase tracking-wider py-3 pl-4">Segment</th>
              </tr>
            </thead>
            <tbody>
              {templateStats.map((tmpl) => (
                <tr key={tmpl.name} className="border-b border-white/5 last:border-0">
                  <td className="py-3 pr-4">
                    <p className="text-white/90 font-medium">{tmpl.displayName}</p>
                    <p className="text-white/30 text-xs mt-0.5 font-mono">{tmpl.name}</p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-white font-bold">{tmpl.sentCount}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-white/40">{tmpl.openRate}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-white/40">{tmpl.clickRate}</span>
                  </td>
                  <td className="py-3 pl-4">
                    <div className="flex flex-wrap gap-1">
                      {tmpl.segments.map((seg) => (
                        <span
                          key={seg}
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${SEGMENT_COLORS[seg] || "bg-white/10 text-white/50"}`}
                        >
                          {seg}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drip Sequence Reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <h3 className="text-blue-300 font-semibold text-sm mb-3">Cold Sequence</h3>
          <div className="space-y-2">
            {[
              { day: 2, name: "Beginner Mistakes" },
              { day: 5, name: "ICT Concepts" },
              { day: 8, name: "Success Story" },
              { day: 14, name: "Coaching CTA" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-white/30 text-xs font-mono w-8">D{step.day}</span>
                <span className="text-white/70 text-xs">{step.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <h3 className="text-yellow-300 font-semibold text-sm mb-3">Warm Sequence</h3>
          <div className="space-y-2">
            {[
              { day: 2, name: "Beginner Mistakes" },
              { day: 4, name: "Social Proof" },
              { day: 7, name: "Book Call (Soft)" },
              { day: 12, name: "Limited Spots" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-white/30 text-xs font-mono w-8">D{step.day}</span>
                <span className="text-white/70 text-xs">{step.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <h3 className="text-red-300 font-semibold text-sm mb-3">Hot Sequence</h3>
          <div className="space-y-2">
            {[
              { day: 0, name: "Book Call (Urgent)" },
              { day: 3, name: "Social Proof" },
              { day: 7, name: "Limited Spots" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-white/30 text-xs font-mono w-8">D{step.day}</span>
                <span className="text-white/70 text-xs">{step.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Future Enhancement Note */}
      <div className="bg-gold/5 border border-gold/20 rounded-lg p-6">
        <h2 className="text-gold font-semibold text-sm mb-2">Future Enhancement</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          Connect Resend webhooks to track open and click rates. Add{" "}
          <code className="text-gold/80 bg-white/5 px-1.5 py-0.5 rounded text-xs">RESEND_WEBHOOK_SECRET</code>{" "}
          to your environment variables and create{" "}
          <code className="text-gold/80 bg-white/5 px-1.5 py-0.5 rounded text-xs">/api/webhooks/resend</code>{" "}
          to capture <code className="text-gold/80 bg-white/5 px-1.5 py-0.5 rounded text-xs">email.opened</code>{" "}
          and <code className="text-gold/80 bg-white/5 px-1.5 py-0.5 rounded text-xs">email.clicked</code> events.
          This will populate the Open Rate and Click Rate columns above.
        </p>
      </div>
    </div>
  );
}
