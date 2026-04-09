"use client";

import { useEffect, useState } from "react";

interface Brief {
  date: string;
  title: string;
  script: string;
  audioUrl: string;
  duration: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function MarketBriefPlayer() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/market-briefs")
      .then((res) => res.json())
      .then((data) => {
        setBriefs(data.briefs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
        <p className="text-gray-400 mt-4">Loading market briefs...</p>
      </div>
    );
  }

  if (briefs.length === 0) {
    return (
      <div className="bg-cream rounded-lg p-12 text-center">
        <p
          className="text-navy/60 text-lg italic"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          First market brief coming soon...
        </p>
        <p className="text-gray-400 mt-2 text-sm">
          Check back tomorrow morning for Harvest&apos;s daily audio brief.
        </p>
      </div>
    );
  }

  const [latest, ...older] = briefs;

  return (
    <div>
      {/* Featured latest brief */}
      <div className="bg-navy rounded-xl p-8 mb-10 text-white">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/20 px-2 py-0.5 rounded">
            Latest
          </span>
          <time className="text-xs text-white/50">
            {formatDate(latest.date)}
          </time>
        </div>
        <h2
          className="text-2xl md:text-3xl font-bold mb-4"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {latest.title}
        </h2>
        <audio
          controls
          preload="metadata"
          className="w-full mb-4 [&::-webkit-media-controls-panel]:bg-navy-light"
          src={latest.audioUrl}
        >
          Your browser does not support the audio element.
        </audio>
        <p className="text-white/40 text-xs mb-4">
          Duration: ~{formatDuration(latest.duration)}
        </p>
        <button
          onClick={() => setExpandedIdx(expandedIdx === -1 ? null : -1)}
          className="text-gold text-sm font-bold uppercase tracking-wide hover:text-gold-light transition-colors"
        >
          {expandedIdx === -1 ? "Hide Transcript" : "Show Transcript"}{" "}
          {expandedIdx === -1 ? "\u25B2" : "\u25BC"}
        </button>
        {expandedIdx === -1 && (
          <div className="mt-4 text-white/70 text-sm leading-relaxed whitespace-pre-line border-t border-white/10 pt-4">
            {latest.script}
          </div>
        )}
      </div>

      {/* Older briefs */}
      {older.length > 0 && (
        <>
          <h3
            className="text-xl font-bold text-navy mb-6"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Previous Briefs
          </h3>
          <div className="space-y-4">
            {older.map((brief, idx) => (
              <div
                key={brief.date}
                className="border border-gray-200 rounded-lg p-6 hover:border-gold/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <time className="text-xs text-gray-400 block mb-1">
                      {formatDate(brief.date)}
                    </time>
                    <h4 className="text-lg font-bold text-navy">
                      {brief.title}
                    </h4>
                  </div>
                  <span className="text-xs text-gray-400">
                    ~{formatDuration(brief.duration)}
                  </span>
                </div>
                <audio
                  controls
                  preload="none"
                  className="w-full mb-3"
                  src={brief.audioUrl}
                >
                  Your browser does not support the audio element.
                </audio>
                <button
                  onClick={() =>
                    setExpandedIdx(expandedIdx === idx ? null : idx)
                  }
                  className="text-gold text-sm font-bold uppercase tracking-wide hover:text-gold-light transition-colors"
                >
                  {expandedIdx === idx
                    ? "Hide Transcript"
                    : "Show Transcript"}{" "}
                  {expandedIdx === idx ? "\u25B2" : "\u25BC"}
                </button>
                {expandedIdx === idx && (
                  <div className="mt-3 text-gray-600 text-sm leading-relaxed whitespace-pre-line border-t border-gray-100 pt-3">
                    {brief.script}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
