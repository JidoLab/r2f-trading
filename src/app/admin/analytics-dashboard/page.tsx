"use client";

import { useEffect, useState } from "react";

interface AnalyticsOverview {
  users: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
}

interface PageViewRow {
  pagePath: string;
  pageTitle: string;
  views: number;
  avgDuration: number;
}

interface TrafficSourceRow {
  source: string;
  medium: string;
  sessions: number;
  users: number;
}

interface DailyMetric {
  date: string;
  users: number;
  pageViews: number;
  sessions: number;
}

interface AnalyticsResponse {
  configured: boolean;
  error?: string;
  overview7d: AnalyticsOverview | null;
  overview30d: AnalyticsOverview | null;
  dailyMetrics: DailyMetric[];
  topPages: PageViewRow[];
  trafficSources: TrafficSourceRow[];
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Analytics Dashboard</h1>
        <div className="text-white/50 animate-pulse">Loading analytics data...</div>
      </div>
    );
  }

  if (!data || !data.configured) {
    return <SetupInstructions />;
  }

  if (data.error) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Analytics Dashboard</h1>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400 font-medium">Error fetching analytics</p>
          <p className="text-red-400/70 text-sm mt-1">{data.error}</p>
        </div>
        <SetupInstructions showAsCollapsed />
      </div>
    );
  }

  const o7 = data.overview7d;
  const o30 = data.overview30d;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
        <span className="text-xs text-green-400/70 bg-green-400/10 px-2 py-1 rounded">
          GA4 Connected
        </span>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Visitors (7d)"
          value={o7?.users ?? 0}
          comparison={o30 ? Math.round((o30.users / 30) * 7) : undefined}
        />
        <MetricCard
          label="Visitors (30d)"
          value={o30?.users ?? 0}
        />
        <MetricCard
          label="Page Views (7d)"
          value={o7?.pageViews ?? 0}
          comparison={o30 ? Math.round((o30.pageViews / 30) * 7) : undefined}
        />
        <MetricCard
          label="Sessions (7d)"
          value={o7?.sessions ?? 0}
          comparison={o30 ? Math.round((o30.sessions / 30) * 7) : undefined}
        />
      </div>

      {/* Bounce Rate & Avg Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-navy border border-white/10 rounded-lg p-4">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Bounce Rate (30d)</div>
          <div className="text-2xl font-bold text-white">
            {o30 ? `${(o30.bounceRate * 100).toFixed(1)}%` : "--"}
          </div>
        </div>
        <div className="bg-navy border border-white/10 rounded-lg p-4">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Avg Session (30d)</div>
          <div className="text-2xl font-bold text-white">
            {o30 ? formatDuration(o30.avgSessionDuration) : "--"}
          </div>
        </div>
      </div>

      {/* Daily Page Views Chart */}
      {data.dailyMetrics.length > 0 && (
        <div className="bg-navy border border-white/10 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
            Daily Page Views (Last 30 Days)
          </h2>
          <DailyChart metrics={data.dailyMetrics} />
        </div>
      )}

      {/* Top Pages */}
      {data.topPages.length > 0 && (
        <div className="bg-navy border border-white/10 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
            Top Pages (30 Days)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left pb-3">Page</th>
                  <th className="text-right pb-3">Views</th>
                  <th className="text-right pb-3">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {data.topPages.slice(0, 15).map((p, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="py-2 text-white/80 max-w-[300px] truncate" title={p.pageTitle}>
                      <span className="text-white/40 text-xs mr-2">{p.pagePath}</span>
                    </td>
                    <td className="py-2 text-right text-white font-medium">{p.views.toLocaleString()}</td>
                    <td className="py-2 text-right text-white/60">{formatDuration(p.avgDuration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Traffic Sources */}
      {data.trafficSources.length > 0 && (
        <div className="bg-navy border border-white/10 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
            Traffic Sources (30 Days)
          </h2>
          <TrafficSourcesChart sources={data.trafficSources} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left pb-3">Source / Medium</th>
                  <th className="text-right pb-3">Sessions</th>
                  <th className="text-right pb-3">Users</th>
                </tr>
              </thead>
              <tbody>
                {data.trafficSources.slice(0, 10).map((s, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="py-2 text-white/80">
                      {s.source} <span className="text-white/30">/ {s.medium}</span>
                    </td>
                    <td className="py-2 text-right text-white font-medium">{s.sessions.toLocaleString()}</td>
                    <td className="py-2 text-right text-white/60">{s.users.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  comparison,
}: {
  label: string;
  value: number;
  comparison?: number;
}) {
  const trend = comparison !== undefined ? value - comparison : undefined;
  const trendPct =
    trend !== undefined && comparison
      ? Math.round((trend / comparison) * 100)
      : undefined;

  return (
    <div className="bg-navy border border-white/10 rounded-lg p-4">
      <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
      {trendPct !== undefined && (
        <div
          className={`text-xs mt-1 ${trendPct >= 0 ? "text-green-400" : "text-red-400"}`}
        >
          {trendPct >= 0 ? "+" : ""}
          {trendPct}% vs avg
        </div>
      )}
    </div>
  );
}

function DailyChart({ metrics }: { metrics: DailyMetric[] }) {
  const max = Math.max(...metrics.map((m) => m.pageViews), 1);
  // Show last 14 days for readability
  const recent = metrics.slice(-14);

  return (
    <div className="flex items-end gap-1 h-32">
      {recent.map((m, i) => {
        const height = Math.max((m.pageViews / max) * 100, 2);
        const dayLabel = new Date(m.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 group relative"
          >
            <div
              className="w-full bg-gold/70 rounded-t hover:bg-gold transition-colors cursor-default"
              style={{ height: `${height}%` }}
              title={`${dayLabel}: ${m.pageViews} views`}
            />
            <span className="text-[9px] text-white/30 truncate w-full text-center">
              {new Date(m.date).getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TrafficSourcesChart({ sources }: { sources: TrafficSourceRow[] }) {
  // Group by medium for a simpler breakdown
  const byMedium: Record<string, number> = {};
  for (const s of sources) {
    const medium = s.medium === "(none)" ? "direct" : s.medium;
    byMedium[medium] = (byMedium[medium] || 0) + s.sessions;
  }

  const sorted = Object.entries(byMedium)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);
  const total = sorted.reduce((sum, [, v]) => sum + v, 0) || 1;

  const colors = [
    "bg-gold",
    "bg-blue-400",
    "bg-green-400",
    "bg-purple-400",
    "bg-orange-400",
    "bg-pink-400",
  ];

  return (
    <div className="space-y-2">
      {sorted.map(([medium, count], i) => {
        const pct = Math.round((count / total) * 100);
        return (
          <div key={medium} className="flex items-center gap-3">
            <span className="text-xs text-white/60 w-20 truncate capitalize">{medium}</span>
            <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
              <div
                className={`h-full ${colors[i] || "bg-white/20"} rounded`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-white/50 w-12 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

function SetupInstructions({ showAsCollapsed }: { showAsCollapsed?: boolean }) {
  const [expanded, setExpanded] = useState(!showAsCollapsed);

  return (
    <div className="max-w-6xl mx-auto">
      {!showAsCollapsed && (
        <h1 className="text-2xl font-bold text-white mb-6">Analytics Dashboard</h1>
      )}

      <div className="bg-navy border border-yellow-500/30 rounded-lg p-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full text-left"
        >
          <span className="text-yellow-400 text-lg">
            {expanded ? "v" : ">"}
          </span>
          <h2 className="text-lg font-semibold text-yellow-400">
            GA4 Data API Setup Required
          </h2>
        </button>

        {expanded && (
          <div className="mt-4 space-y-4 text-sm text-white/70">
            <p>
              To show real visitor data, connect your Google Analytics 4 property
              via a service account. Your Measurement ID (G-DL8TG7YHRN) is for
              client-side tracking only — the Data API needs a separate setup.
            </p>

            <div className="space-y-3">
              <Step n={1} title="Enable the Google Analytics Data API">
                Go to{" "}
                <a
                  href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:underline"
                >
                  Google Cloud Console &gt; APIs &amp; Services
                </a>{" "}
                and enable <strong>Google Analytics Data API</strong>.
              </Step>

              <Step n={2} title="Create a Service Account">
                Go to{" "}
                <a
                  href="https://console.cloud.google.com/iam-admin/serviceaccounts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:underline"
                >
                  IAM &gt; Service Accounts
                </a>{" "}
                &gt; Create Service Account. Download the JSON key file.
              </Step>

              <Step n={3} title="Grant GA4 Access">
                In Google Analytics: <strong>Admin &gt; Property &gt; Property
                Access Management</strong>. Add the service account email
                (from the JSON key) with <strong>Viewer</strong> role.
              </Step>

              <Step n={4} title="Find your GA4 Property ID">
                In Google Analytics: <strong>Admin &gt; Property Settings</strong>.
                Copy the <strong>Property ID</strong> (numeric, e.g. 123456789).
              </Step>

              <Step n={5} title="Add Environment Variables">
                Add these to your Vercel project (Settings &gt; Environment Variables):
              </Step>
            </div>

            <div className="bg-black/30 rounded-lg p-4 font-mono text-xs space-y-2 overflow-x-auto">
              <div>
                <span className="text-green-400">GA4_PROPERTY_ID</span>
                <span className="text-white/40">=</span>
                <span className="text-white/60">properties/123456789</span>
              </div>
              <div>
                <span className="text-green-400">GOOGLE_SERVICE_ACCOUNT_KEY</span>
                <span className="text-white/40">=</span>
                <span className="text-white/60">
                  {`{"type":"service_account","project_id":"...","private_key":"...","client_email":"...",...}`}
                </span>
              </div>
            </div>

            <p className="text-white/40 text-xs">
              After adding the env vars, redeploy the project. The dashboard will
              automatically start showing real data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <div>
        <div className="font-medium text-white/90">{title}</div>
        <div className="text-white/50 mt-0.5">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}
