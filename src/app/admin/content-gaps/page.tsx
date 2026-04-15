"use client";

import { useEffect, useState } from "react";

interface ContentGap {
  topic: string;
  keyword: string;
  searchIntent: "informational" | "commercial" | "navigational";
  difficulty: "easy" | "medium" | "hard";
  reason: string;
  suggestedTitle: string;
}

interface GapsData {
  gaps: ContentGap[];
  generatedAt: string;
  existingTopics: string[];
}

const INTENT_STYLES: Record<string, string> = {
  commercial: "bg-green-500/20 text-green-400",
  informational: "bg-blue-500/20 text-blue-400",
  navigational: "bg-purple-500/20 text-purple-400",
};

const DIFF_STYLES: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  hard: "bg-red-500/20 text-red-400",
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ContentGapsPage() {
  const [data, setData] = useState<GapsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/content-gaps")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Analyzing content gaps...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-red-400 text-sm py-20 text-center">Failed to load content gaps</div>;
  }

  const commercial = data.gaps.filter(g => g.searchIntent === "commercial");
  const informational = data.gaps.filter(g => g.searchIntent === "informational");
  const easy = data.gaps.filter(g => g.difficulty === "easy");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Gaps</h1>
          <p className="text-white/40 text-sm mt-1">
            Missing topics that would drive organic search traffic — based on your {data.existingTopics.length} existing posts
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/30 text-xs">
            Generated {data.generatedAt ? relativeTime(data.generatedAt) : "never"}
          </p>
          <p className="text-white/20 text-xs">Refreshes every 3 days</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Gaps Found</p>
          <p className="text-3xl font-black text-gold">{data.gaps.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Commercial Intent</p>
          <p className="text-3xl font-black text-green-400">{commercial.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Easy Wins</p>
          <p className="text-3xl font-black text-blue-400">{easy.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Existing Posts</p>
          <p className="text-3xl font-black text-white/60">{data.existingTopics.length}</p>
        </div>
      </div>

      {/* Priority: Commercial intent + Easy difficulty */}
      {commercial.filter(g => g.difficulty === "easy").length > 0 && (
        <div className="bg-gold/5 border border-gold/20 rounded-lg p-5">
          <h2 className="text-gold font-bold text-sm mb-2">High Priority — Easy Commercial Wins</h2>
          <p className="text-white/40 text-xs mb-3">These topics have buying intent and low competition. Write these first.</p>
          <div className="space-y-2">
            {commercial.filter(g => g.difficulty === "easy").map((gap, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 rounded-md px-3 py-2">
                <span className="text-gold font-black text-sm w-5">{i + 1}</span>
                <span className="text-white/80 text-sm flex-1">{gap.suggestedTitle}</span>
                <span className="text-white/30 text-xs shrink-0">{gap.keyword}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Gaps */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-white font-semibold text-sm mb-4">All Content Gaps</h2>
        <div className="space-y-3">
          {data.gaps.map((gap, i) => (
            <div key={i} className="border border-white/5 rounded-lg p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${INTENT_STYLES[gap.searchIntent] || ""}`}>
                      {gap.searchIntent}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${DIFF_STYLES[gap.difficulty] || ""}`}>
                      {gap.difficulty}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold text-sm">{gap.suggestedTitle}</h3>
                  <p className="text-white/30 text-xs mt-1">Keyword: <span className="text-white/50">{gap.keyword}</span></p>
                </div>
              </div>
              <p className="text-white/40 text-xs italic">{gap.reason}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
