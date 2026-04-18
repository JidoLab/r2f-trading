"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CategoryStat {
  category: string;
  count: number;
  topUsed: { url: string; usageCount: number } | null;
}

interface Stats {
  total: number;
  byCategory: CategoryStat[];
  topUsed: { url: string; category: string; usageCount: number }[];
  bottomUsed: { url: string; category: string; usageCount: number }[];
  availableCategories: string[];
  pexelsConfigured: boolean;
}

interface Clip {
  id: string;
  url: string;
  category: string;
  pexelsId?: number;
  usageCount: number;
  addedAt: string;
}

export default function StockLibraryPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanding, setExpanding] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [filter, setFilter] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const [sRes, lRes] = await Promise.all([
        fetch("/api/admin/shorts/stock-library"),
        fetch("/api/admin/shorts/stock-library?list=1"),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (lRes.ok) {
        const d = await lRes.json();
        setClips(d.clips || []);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function expand(category: string | null) {
    setMessage("");
    setExpanding(category || "__all__");
    try {
      const body = category ? { category, count } : { all: true, count };
      const res = await fetch("/api/admin/shorts/stock-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${d.error || "Failed"}`);
      } else if (category) {
        setMessage(`✅ ${category}: added ${d.added} clips (${d.total} total in category)`);
      } else {
        setMessage(`✅ Expanded all: +${d.totalAdded} clips across ${d.results?.length || 0} categories`);
      }
      await load();
    } catch (e) {
      setMessage(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
    setExpanding(null);
  }

  const filteredClips = filter
    ? clips.filter((c) => c.category === filter)
    : clips;

  return (
    <main className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/admin/shorts"
            className="text-xs font-bold tracking-[0.2em] uppercase text-navy/60 hover:text-gold"
          >
            ← Shorts Pipeline
          </Link>
          <h1 className="text-3xl font-bold text-navy mt-2">Stock Video Library</h1>
          <p className="text-gray-500 text-sm mt-1">
            Pexels-sourced B-roll. Expand categories to give the shorts renderer more variety.
          </p>
        </div>
      </div>

      {!stats?.pexelsConfigured && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <strong>PEXELS_API_KEY not set.</strong> Add it to Vercel env vars to enable expansion.
        </div>
      )}

      {message && (
        <div
          className={`mb-6 rounded-md border p-4 text-sm ${
            message.startsWith("✅")
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-navy text-white rounded-lg p-5">
          <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Total Clips</p>
          <p className="text-4xl font-black text-gold">{stats?.total ?? "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Categories</p>
          <p className="text-4xl font-black text-navy">{stats?.byCategory.length ?? "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Avg / Category</p>
          <p className="text-4xl font-black text-navy">
            {stats ? Math.round(stats.total / Math.max(1, stats.byCategory.length)) : "—"}
          </p>
        </div>
        <div className="bg-gold/10 border border-gold/30 rounded-lg p-5 flex flex-col">
          <p className="text-navy text-xs font-bold uppercase tracking-wider mb-2">Expand All</p>
          <div className="flex items-center gap-2 mt-auto">
            <input
              type="number"
              min={1}
              max={30}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value || "10", 10))}
              className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <button
              disabled={!stats?.pexelsConfigured || !!expanding}
              onClick={() => expand(null)}
              className="flex-1 bg-gold hover:bg-gold-light text-navy font-bold text-xs uppercase tracking-wider px-3 py-2 rounded disabled:opacity-40 transition-colors"
            >
              {expanding === "__all__" ? "Expanding…" : `+${count}/cat`}
            </button>
          </div>
        </div>
      </div>

      {/* Per-category table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-8">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Categories
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">Clips</th>
              <th className="px-4 py-2">Most Used</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.availableCategories || []).map((cat) => {
              const s = stats?.byCategory.find((c) => c.category === cat);
              const n = s?.count ?? 0;
              return (
                <tr key={cat} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-navy">{cat}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        n < 10
                          ? "bg-red-100 text-red-700"
                          : n < 25
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {n}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {s?.topUsed
                      ? `${s.topUsed.usageCount}× used`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={!stats?.pexelsConfigured || !!expanding}
                      onClick={() => expand(cat)}
                      className="bg-navy hover:bg-navy-light text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded disabled:opacity-40 transition-colors"
                    >
                      {expanding === cat ? "…" : `+${count}`}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Clip grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-navy">All Clips ({filteredClips.length})</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {stats?.availableCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredClips.slice(0, 120).map((c) => (
            <div
              key={c.id}
              className="relative rounded-md overflow-hidden bg-black aspect-[9/16] group"
            >
              <video
                src={c.url}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
                onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                onMouseLeave={(e) => {
                  const v = e.target as HTMLVideoElement;
                  v.pause();
                  v.currentTime = 0;
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                <p className="text-[10px] font-mono text-gold uppercase tracking-wider">
                  {c.category}
                </p>
                <p className="text-[10px] text-white/70">used {c.usageCount}×</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {filteredClips.length > 120 && (
        <p className="text-center text-xs text-gray-500 mt-4">
          Showing first 120 of {filteredClips.length} clips
        </p>
      )}
    </main>
  );
}
