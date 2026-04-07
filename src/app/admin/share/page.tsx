"use client";

import { useState } from "react";

const PLATFORMS = [
  { id: "twitter", label: "X / Twitter", color: "text-white" },
  { id: "facebook", label: "Facebook", color: "text-blue-400" },
  { id: "linkedin", label: "LinkedIn", color: "text-blue-300" },
  { id: "telegram", label: "Telegram", color: "text-sky-400" },
  { id: "discord", label: "Discord", color: "text-indigo-400" },
  { id: "reddit", label: "Reddit", color: "text-orange-400" },
];

export default function AdminSharePage() {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<string[]>(PLATFORMS.map(p => p.id));
  const [sharing, setSharing] = useState(false);
  const [results, setResults] = useState<{ platform: string; status: string }[] | null>(null);

  function togglePlatform(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  async function handleShare() {
    if (!url || !caption) return alert("Enter both a URL and caption");
    setSharing(true);
    setResults(null);
    try {
      const res = await fetch("/api/admin/share-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, caption, platforms: selected }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.results);
      } else {
        alert(`Failed: ${data.error || "Unknown error"}`);
      }
    } catch { alert("Share failed"); }
    setSharing(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Quick Share</h1>
      <p className="text-white/50 text-sm mb-8">
        Share any link to all your social platforms. Great for TradingView ideas, articles, announcements.
      </p>

      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="text-white/60 text-xs font-bold uppercase tracking-wider block mb-2">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.tradingview.com/chart/EURUSD/..."
              className="w-full px-4 py-2.5 rounded-md bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="text-white/60 text-xs font-bold uppercase tracking-wider block mb-2">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Check out my latest EURUSD analysis! Key level at 1.0850 with a bullish order block forming. #ICTTrading #Forex"
              rows={3}
              className="w-full px-4 py-2.5 rounded-md bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold resize-none"
            />
            <p className="text-white/20 text-xs mt-1">{caption.length}/280 characters</p>
          </div>

          <div>
            <label className="text-white/60 text-xs font-bold uppercase tracking-wider block mb-2">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    selected.includes(p.id)
                      ? `bg-white/10 ${p.color} border border-white/20`
                      : "bg-white/[0.03] text-white/20 border border-white/5"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleShare}
            disabled={sharing || !url || !caption}
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-2.5 rounded-md transition-all disabled:opacity-50"
          >
            {sharing ? "Sharing..." : `Share to ${selected.length} Platform${selected.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Results</h2>
          <div className="flex flex-wrap gap-2">
            {results.map((r) => (
              <span key={r.platform} className={`text-xs font-bold uppercase px-3 py-1.5 rounded-md ${
                r.status === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              }`}>
                {r.platform.replace("_", " ")} {r.status === "success" ? "✓" : "✗"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
