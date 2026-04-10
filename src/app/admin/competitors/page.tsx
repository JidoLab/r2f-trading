"use client";

import { useEffect, useState } from "react";

interface Video {
  title: string;
  videoId: string;
  publishedAt: string;
  viewCount: string;
  thumbnailUrl: string;
}

interface CompetitorData {
  name: string;
  channel: string;
  channelId: string;
  subscriberCount: string;
  videoCount: string;
  thumbnailUrl: string;
  latestVideos: Video[];
  videosPerWeek: number;
}

interface CompetitorPayload {
  fetchedAt: string;
  competitors: CompetitorData[];
  contentGaps: string[];
  error?: string;
}

function formatNumber(n: string | number): string {
  const num = typeof n === "string" ? parseInt(n, 10) : n;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(d: string) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function CompetitorsPage() {
  const [data, setData] = useState<CompetitorPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/competitors")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white/50 text-sm">Loading competitor data...</div>;
  if (!data) return <div className="text-red-400 text-sm">Failed to load competitor data.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Competitor Spy</h1>
          <p className="text-white/40 text-sm mt-1">YouTube competitor analysis and content gaps</p>
        </div>
        {data.fetchedAt && (
          <span className="text-white/30 text-xs">Last updated: {formatDate(data.fetchedAt)}</span>
        )}
      </div>

      {data.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm">{data.error}</p>
          <p className="text-white/40 text-xs mt-1">Add YOUTUBE_API_KEY to your environment variables to enable competitor tracking.</p>
        </div>
      )}

      {/* Competitor Cards */}
      {data.competitors.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {data.competitors.map(comp => (
            <div key={comp.channelId} className="bg-white/5 border border-white/10 rounded-lg p-6">
              {/* Channel Header */}
              <div className="flex items-center gap-4 mb-4">
                {comp.thumbnailUrl && (
                  <img
                    src={comp.thumbnailUrl}
                    alt={comp.name}
                    className="w-12 h-12 rounded-full border border-white/10"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-semibold text-sm truncate">{comp.name}</h2>
                  <p className="text-white/40 text-xs">{comp.channel}</p>
                </div>
                <a
                  href={`https://youtube.com/${comp.channel}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold text-xs font-bold hover:text-gold-light transition-colors shrink-0"
                >
                  View Channel
                </a>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white/[0.03] border border-white/5 rounded-md p-3 text-center">
                  <p className="text-gold font-black text-lg">{formatNumber(comp.subscriberCount)}</p>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider">Subscribers</p>
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-md p-3 text-center">
                  <p className="text-white font-black text-lg">{formatNumber(comp.videoCount)}</p>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider">Videos</p>
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-md p-3 text-center">
                  <p className="text-white font-black text-lg">{comp.videosPerWeek}</p>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider">Per Week</p>
                </div>
              </div>

              {/* Latest Videos */}
              <div>
                <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Latest Videos</p>
                <div className="space-y-2">
                  {comp.latestVideos.map(v => (
                    <a
                      key={v.videoId}
                      href={`https://youtube.com/watch?v=${v.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-xs truncate group-hover:text-white transition-colors">{v.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-white/30 text-[10px]">{timeAgo(v.publishedAt)}</span>
                          <span className="text-white/20 text-[10px]">|</span>
                          <span className="text-white/30 text-[10px]">{formatNumber(v.viewCount)} views</span>
                        </div>
                      </div>
                    </a>
                  ))}
                  {comp.latestVideos.length === 0 && (
                    <p className="text-white/20 text-xs">No recent videos found.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content Gaps */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-white font-semibold text-sm mb-2">Content Gaps</h2>
        <p className="text-white/40 text-xs mb-4">Competitor video topics that R2F Trading hasn&apos;t covered yet</p>
        {data.contentGaps.length === 0 ? (
          <p className="text-white/30 text-sm">
            {data.competitors.length === 0
              ? "Add YOUTUBE_API_KEY to analyze content gaps."
              : "No content gaps detected — great coverage!"}
          </p>
        ) : (
          <div className="space-y-2">
            {data.contentGaps.map((gap, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                <span className="text-gold font-bold text-xs mt-0.5 shrink-0">{i + 1}.</span>
                <p className="text-white/80 text-sm">{gap}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
