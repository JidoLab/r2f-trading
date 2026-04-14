"use client";

import { useEffect, useState } from "react";

interface SearchQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SearchPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface ContentGap {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  opportunity: "high" | "medium";
}

interface Suggestion {
  query: string;
  suggestedTitle: string;
  angle: string;
  priority: string;
  estimatedImpact: string;
}

interface SearchInsightsData {
  configured: boolean;
  error?: string;
  topQueries: SearchQuery[];
  topPages: SearchPage[];
  contentGaps: ContentGap[];
  suggestions: Suggestion[];
  searchStats?: {
    totalClicks: number;
    totalImpressions: number;
    avgCtr: number;
    avgPosition: number;
  } | null;
  dateRange?: { start: string; end: string };
  totalClicks?: number;
  totalImpressions?: number;
  avgCtr?: number;
  avgPosition?: number;
}

export default function SearchInsightsPage() {
  const [data, setData] = useState<SearchInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"queries" | "pages" | "gaps" | "suggestions">("queries");

  useEffect(() => {
    fetch("/api/admin/search-insights")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  if (!data || !data.configured) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Search Insights</h1>
        <div className="bg-white/5 border border-white/10 rounded-xl p-8">
          <h2 className="text-lg font-semibold text-gold mb-4">Setup Required</h2>
          <p className="text-white/60 mb-6">
            Connect Google Search Console to see what people search to find your site.
          </p>
          <div className="space-y-4 text-sm text-white/50">
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-white/80 font-medium mb-2">Step 1: Create a Service Account</h3>
              <p>Go to Google Cloud Console &rarr; IAM &rarr; Service Accounts &rarr; Create one with no special roles.</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-white/80 font-medium mb-2">Step 2: Download the JSON Key</h3>
              <p>Click the service account &rarr; Keys &rarr; Add Key &rarr; JSON. Download the file.</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-white/80 font-medium mb-2">Step 3: Add to Search Console</h3>
              <p>In Search Console &rarr; Settings &rarr; Users and permissions &rarr; Add user with the service account email as &quot;Full&quot; access.</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-white/80 font-medium mb-2">Step 4: Set Environment Variables</h3>
              <p className="font-mono text-xs text-gold/70">
                GSC_SITE_URL=https://r2ftrading.com<br />
                GOOGLE_SERVICE_ACCOUNT_KEY=&#123;...entire JSON key...&#125;
              </p>
              <p className="mt-2 text-white/40">If you already have GOOGLE_SERVICE_ACCOUNT_KEY set for GA4, you only need GSC_SITE_URL.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Search Insights</h1>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-300">
          {data.error}
        </div>
      </div>
    );
  }

  const totalClicks = data.totalClicks ?? data.searchStats?.totalClicks ?? 0;
  const totalImpressions = data.totalImpressions ?? data.searchStats?.totalImpressions ?? 0;
  const avgCtr = data.avgCtr ?? data.searchStats?.avgCtr ?? 0;
  const avgPosition = data.avgPosition ?? data.searchStats?.avgPosition ?? 0;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Search Insights</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Clicks" value={totalClicks.toLocaleString()} />
        <StatCard label="Impressions" value={totalImpressions.toLocaleString()} />
        <StatCard label="Avg CTR" value={`${avgCtr}%`} />
        <StatCard label="Avg Position" value={avgPosition.toString()} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 mb-6">
        {(
          [
            { key: "queries", label: "Top Queries", count: data.topQueries.length },
            { key: "pages", label: "Top Pages", count: data.topPages.length },
            { key: "gaps", label: "Content Gaps", count: data.contentGaps.length },
            { key: "suggestions", label: "AI Topics", count: data.suggestions.length },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-gold text-black"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "queries" && (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/40">
                <th className="px-4 py-3 font-medium">Query</th>
                <th className="px-4 py-3 font-medium text-right">Clicks</th>
                <th className="px-4 py-3 font-medium text-right">Impressions</th>
                <th className="px-4 py-3 font-medium text-right">CTR</th>
                <th className="px-4 py-3 font-medium text-right">Position</th>
              </tr>
            </thead>
            <tbody>
              {data.topQueries.slice(0, 50).map((q, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white/80">{q.query}</td>
                  <td className="px-4 py-3 text-right text-white/60">{q.clicks}</td>
                  <td className="px-4 py-3 text-right text-white/60">{q.impressions}</td>
                  <td className="px-4 py-3 text-right text-white/60">{q.ctr}%</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`${
                        q.position <= 3
                          ? "text-green-400"
                          : q.position <= 10
                            ? "text-gold"
                            : "text-white/40"
                      }`}
                    >
                      {q.position}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.topQueries.length === 0 && (
            <p className="text-center text-white/30 py-8">No query data available yet.</p>
          )}
        </div>
      )}

      {tab === "pages" && (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/40">
                <th className="px-4 py-3 font-medium">Page</th>
                <th className="px-4 py-3 font-medium text-right">Clicks</th>
                <th className="px-4 py-3 font-medium text-right">Impressions</th>
                <th className="px-4 py-3 font-medium text-right">CTR</th>
                <th className="px-4 py-3 font-medium text-right">Position</th>
              </tr>
            </thead>
            <tbody>
              {data.topPages.map((p, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white/80 truncate max-w-[300px]">
                    {p.page.replace(/^https?:\/\/[^/]+/, "")}
                  </td>
                  <td className="px-4 py-3 text-right text-white/60">{p.clicks}</td>
                  <td className="px-4 py-3 text-right text-white/60">{p.impressions}</td>
                  <td className="px-4 py-3 text-right text-white/60">{p.ctr}%</td>
                  <td className="px-4 py-3 text-right text-white/60">{p.position}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.topPages.length === 0 && (
            <p className="text-center text-white/30 py-8">No page data available yet.</p>
          )}
        </div>
      )}

      {tab === "gaps" && (
        <div className="space-y-3">
          <p className="text-white/40 text-sm mb-4">
            Queries where you rank on positions 8-20 (page 2). These are your best opportunities to create targeted content.
          </p>
          {data.contentGaps.length === 0 ? (
            <p className="text-center text-white/30 py-8">No content gaps found. You might be ranking well already!</p>
          ) : (
            data.contentGaps.map((gap, i) => (
              <div
                key={i}
                className={`bg-white/5 border rounded-xl p-4 ${
                  gap.opportunity === "high"
                    ? "border-gold/30"
                    : "border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{gap.query}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          gap.opportunity === "high"
                            ? "bg-gold/20 text-gold"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {gap.opportunity}
                      </span>
                    </div>
                    <p className="text-sm text-white/40">
                      {gap.impressions} impressions &middot; {gap.clicks} clicks &middot; {gap.ctr}% CTR
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-white/60">#{Math.round(gap.position)}</div>
                    <div className="text-[10px] text-white/30 uppercase">Position</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "suggestions" && (
        <div className="space-y-3">
          <p className="text-white/40 text-sm mb-4">
            AI-generated blog topics based on your search data. Updated weekly on Mondays.
          </p>
          {data.suggestions.length === 0 ? (
            <p className="text-center text-white/30 py-8">
              No suggestions yet. The content-from-search cron runs weekly on Monday.
            </p>
          ) : (
            data.suggestions.map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="text-white font-medium">{s.suggestedTitle}</h3>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      s.priority === "high"
                        ? "bg-gold/20 text-gold"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {s.priority}
                  </span>
                </div>
                <p className="text-sm text-white/50 mb-2">{s.angle}</p>
                <div className="flex items-center gap-4 text-xs text-white/30">
                  <span>Query: &quot;{s.query}&quot;</span>
                  <span>{s.estimatedImpact}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1">
        {label}
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}
