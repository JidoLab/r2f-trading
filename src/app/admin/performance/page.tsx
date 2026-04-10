"use client";

import { useEffect, useState } from "react";

interface BlogRanking {
  slug: string;
  title: string;
  date: string;
  platforms: string[];
  totalShares: number;
}

interface ShortRanking {
  slug: string;
  title: string;
  date: string;
  platforms: string[];
  status: string;
}

interface TextPostRanking {
  postType: string;
  text: string;
  date: string;
  platforms: string[];
  successCount: number;
}

interface RedditComment {
  subreddit: string;
  postTitle: string;
  date: string;
  mentionedR2F: boolean;
  permalink: string;
}

interface TwitterReply {
  replyTo: string;
  text: string;
  date: string;
}

interface PerformanceData {
  summary: { blogs: number; shorts: number; socialPosts: number; engagements: number };
  blogRankings: BlogRanking[];
  shortRankings: ShortRanking[];
  textPostRankings: TextPostRanking[];
  redditComments: RedditComment[];
  twitterReplies: TwitterReply[];
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function PlatformBadge({ name }: { name: string }) {
  const colors: Record<string, string> = {
    twitter: "bg-sky-500/20 text-sky-400",
    facebook: "bg-blue-500/20 text-blue-400",
    linkedin: "bg-blue-700/20 text-blue-300",
    "reddit-sub": "bg-orange-500/20 text-orange-400",
    "reddit-profile": "bg-orange-500/20 text-orange-300",
    telegram: "bg-cyan-500/20 text-cyan-400",
    discord: "bg-indigo-500/20 text-indigo-400",
    pinterest: "bg-red-500/20 text-red-400",
    youtube: "bg-red-600/20 text-red-400",
    tiktok: "bg-pink-500/20 text-pink-400",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors[name] || "bg-white/10 text-white/60"}`}>
      {name.replace("-sub", "").replace("-profile", " (u)")}
    </span>
  );
}

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/performance")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white/50 text-sm">Loading performance data...</div>;
  if (!data) return <div className="text-red-400 text-sm">Failed to load performance data.</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Content Performance</h1>
        <p className="text-white/40 text-sm mt-1">Rankings and engagement across all content types</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Blog Posts Shared</p>
          <p className="text-3xl font-black text-gold">{data.summary.blogs}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Shorts Published</p>
          <p className="text-3xl font-black text-gold">{data.summary.shorts}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Social Text Posts</p>
          <p className="text-3xl font-black text-white">{data.summary.socialPosts}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Engagement Comments</p>
          <p className="text-3xl font-black text-white">{data.summary.engagements}</p>
        </div>
      </div>

      {/* Blog Rankings */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4">Top 5 Blog Posts by Social Reach</h2>
        {data.blogRankings.length === 0 ? (
          <p className="text-white/30 text-sm">No blog share data yet.</p>
        ) : (
          <div className="space-y-3">
            {data.blogRankings.map((b, i) => (
              <div key={b.slug} className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0">
                <span className="text-gold font-black text-lg w-6 text-center shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm font-medium truncate">{b.title}</p>
                  <p className="text-white/30 text-xs mt-1">{formatDate(b.date)}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {b.platforms.map(p => <PlatformBadge key={p} name={p} />)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-gold font-bold text-sm">{b.totalShares}</p>
                  <p className="text-white/30 text-[10px]">shares</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shorts Rankings */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4">Top 5 Shorts by Platform Coverage</h2>
        {data.shortRankings.length === 0 ? (
          <p className="text-white/30 text-sm">No shorts data yet.</p>
        ) : (
          <div className="space-y-3">
            {data.shortRankings.map((s, i) => (
              <div key={s.slug} className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0">
                <span className="text-gold font-black text-lg w-6 text-center shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm font-medium truncate">{s.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-white/30 text-xs">{formatDate(s.date)}</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      s.status === "published" ? "bg-green-500/20 text-green-400" :
                      s.status === "ready" ? "bg-blue-500/20 text-blue-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>{s.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.platforms.map(p => <PlatformBadge key={p} name={p} />)}
                    {s.platforms.length === 0 && <span className="text-white/20 text-xs">No uploads yet</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-bold text-sm">{s.platforms.length}</p>
                  <p className="text-white/30 text-[10px]">platforms</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Text Post Rankings */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4">Top 5 Social Text Posts</h2>
        {data.textPostRankings.length === 0 ? (
          <p className="text-white/30 text-sm">No text post data yet.</p>
        ) : (
          <div className="space-y-3">
            {data.textPostRankings.map((t, i) => (
              <div key={`${t.date}-${i}`} className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0">
                <span className="text-gold font-black text-lg w-6 text-center shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm">{t.text}{t.text.length >= 120 ? "..." : ""}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-white/30 text-xs">{formatDate(t.date)}</p>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 text-white/50">{t.postType}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.platforms.map(p => <PlatformBadge key={p} name={p} />)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-bold text-sm">{t.successCount}</p>
                  <p className="text-white/30 text-[10px]">platforms</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reddit Comments */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4">Recent Reddit Engagements</h2>
        {data.redditComments.length === 0 ? (
          <p className="text-white/30 text-sm">No Reddit comment data yet.</p>
        ) : (
          <div className="space-y-3">
            {data.redditComments.map((c, i) => (
              <div key={`${c.permalink}-${i}`} className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0">
                <span className="text-orange-400 font-black text-lg w-6 text-center shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm font-medium truncate">{c.postTitle}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/20 text-orange-400">r/{c.subreddit}</span>
                    <p className="text-white/30 text-xs">{formatDate(c.date)}</p>
                    {c.mentionedR2F && (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gold/20 text-gold">R2F Mentioned</span>
                    )}
                  </div>
                </div>
                <a
                  href={`https://reddit.com${c.permalink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold text-xs font-bold hover:text-gold-light transition-colors shrink-0"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Twitter Replies */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-white font-semibold text-sm mb-4">Recent Twitter Replies</h2>
        {data.twitterReplies.length === 0 ? (
          <p className="text-white/30 text-sm">No Twitter reply data yet.</p>
        ) : (
          <div className="space-y-3">
            {data.twitterReplies.map((t, i) => (
              <div key={`${t.date}-${i}`} className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0">
                <span className="text-sky-400 font-black text-lg w-6 text-center shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm">{t.text}{t.text.length >= 120 ? "..." : ""}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-white/30 text-xs">{formatDate(t.date)}</p>
                    <span className="text-white/20 text-xs">Reply to: {t.replyTo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
