"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Platform = "youtube" | "facebook_group" | "linkedin" | "medium" | "quora" | "tradingview" | "forexfactory" | "babypips";

interface ReplySuggestion {
  id: string;
  platform: Platform;
  postTitle: string;
  postUrl: string;
  authorName: string;
  suggestedReply: string;
  createdAt: string;
  status: "pending" | "used" | "skipped";
}

const PLATFORM_CONFIG: Record<Platform, { label: string; abbr: string; bg: string; text: string }> = {
  youtube:        { label: "YouTube",      abbr: "YT", bg: "bg-red-600/20",    text: "text-red-400" },
  facebook_group: { label: "Facebook",     abbr: "FB", bg: "bg-blue-600/20",   text: "text-blue-400" },
  linkedin:       { label: "LinkedIn",     abbr: "LI", bg: "bg-blue-500/20",   text: "text-blue-300" },
  medium:         { label: "Medium",       abbr: "M",  bg: "bg-neutral-700/30", text: "text-neutral-300" },
  quora:          { label: "Quora",        abbr: "Q",  bg: "bg-red-700/20",    text: "text-red-300" },
  tradingview:    { label: "TradingView",  abbr: "TV", bg: "bg-blue-500/20",   text: "text-blue-300" },
  forexfactory:   { label: "ForexFactory", abbr: "FF", bg: "bg-green-600/20",  text: "text-green-400" },
  babypips:       { label: "BabyPips",     abbr: "BP", bg: "bg-green-500/20",  text: "text-green-300" },
};

const TAB_ORDER: Platform[] = ["youtube", "facebook_group", "linkedin", "medium", "quora", "tradingview", "forexfactory", "babypips"];

function PlatformIcon({ platform, size = "md" }: { platform: string; size?: "sm" | "md" }) {
  const config = PLATFORM_CONFIG[platform as Platform];
  const dims = size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
  if (config) {
    return (
      <span className={`inline-flex items-center justify-center rounded-full ${config.bg} ${config.text} ${dims} font-bold shrink-0`}>
        {config.abbr}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-white/10 text-white/60 ${dims} font-bold shrink-0`}>
      ?
    </span>
  );
}

function PlatformBadge({ platform }: { platform: Platform }) {
  const config = PLATFORM_CONFIG[platform];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.abbr} {config.label}
    </span>
  );
}

export default function ReplySuggestionsPage() {
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | Platform>("all");

  useEffect(() => {
    fetchSuggestions();
  }, []);

  async function fetchSuggestions() {
    try {
      const res = await fetch("/api/admin/reply-suggestions");
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(
    id: string,
    action: "markUsed" | "skip" | "regenerate"
  ) {
    setActing(id);
    try {
      const res = await fetch("/api/admin/reply-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      if (res.ok) {
        if (action === "regenerate") {
          const data = await res.json();
          setSuggestions((prev) =>
            prev.map((s) =>
              s.id === id
                ? { ...s, suggestedReply: data.suggestedReply, status: "pending" }
                : s
            )
          );
        } else {
          await fetchSuggestions();
        }
      }
    } catch {
      // Failed
    } finally {
      setActing(null);
    }
  }

  async function handleCopyAndOpen(suggestion: ReplySuggestion) {
    try {
      await navigator.clipboard.writeText(suggestion.suggestedReply);
      setCopied(suggestion.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard failed
    }
    window.open(suggestion.postUrl, "_blank");
    handleAction(suggestion.id, "markUsed");
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  const filtered = activeTab === "all" ? suggestions : suggestions.filter((s) => s.platform === activeTab);
  const pending = filtered.filter((s) => s.status === "pending");
  const history = filtered.filter((s) => s.status !== "pending");

  const allPending = suggestions.filter((s) => s.status === "pending");
  const pendingByPlatform = allPending.reduce<Partial<Record<Platform, number>>>((acc, s) => {
    acc[s.platform] = (acc[s.platform] || 0) + 1;
    return acc;
  }, {});

  // Platforms that have at least 1 suggestion (pending or history)
  const activePlatforms = TAB_ORDER.filter((p) => suggestions.some((s) => s.platform === p));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Reply Suggestions</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-white/50 text-sm">
              {allPending.length} pending
            </span>
            {Object.entries(pendingByPlatform).map(([p, count]) => {
              const config = PLATFORM_CONFIG[p as Platform];
              return config ? (
                <span
                  key={p}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}
                >
                  {config.abbr} {count}
                </span>
              ) : null;
            })}
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <Link
            href="/admin"
            className="text-white/40 hover:text-white text-sm transition-colors"
          >
            &larr; Dashboard
          </Link>
        </div>
      </div>

      {/* Platform Filter Tabs */}
      {activePlatforms.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "bg-gold/20 text-gold"
                : "bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10"
            }`}
          >
            All
            <span className="ml-1.5 text-xs opacity-70">{allPending.length}</span>
          </button>
          {activePlatforms.map((p) => {
            const config = PLATFORM_CONFIG[p];
            const count = pendingByPlatform[p] || 0;
            return (
              <button
                key={p}
                onClick={() => setActiveTab(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === p
                    ? `${config.bg} ${config.text}`
                    : "bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10"
                }`}
              >
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
                  {config.abbr}
                </span>
                {config.label}
                {count > 0 && (
                  <span className="text-xs opacity-70">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Pending Suggestions */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">
          Pending Replies
          {pending.length > 0 && (
            <span className="ml-2 bg-gold/20 text-gold text-xs font-bold px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </h2>

        {pending.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
            <p className="text-white/40 text-sm">
              No pending reply suggestions. The cron job runs daily at 3 AM UTC.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-white/5 border border-white/10 rounded-lg p-6"
              >
                <div className="flex items-start gap-4">
                  <PlatformIcon platform={suggestion.platform} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <a
                        href={suggestion.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white font-semibold hover:text-gold transition-colors truncate"
                      >
                        {suggestion.postTitle}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <PlatformBadge platform={suggestion.platform} />
                      <span className="text-white/20">&middot;</span>
                      <span className="text-white/40 text-xs">
                        by {suggestion.authorName}
                      </span>
                      <span className="text-white/20">&middot;</span>
                      <span className="text-white/30 text-xs">
                        {formatDate(suggestion.createdAt)}
                      </span>
                    </div>

                    {/* Suggested Reply Box */}
                    <div className="bg-white/5 border border-white/10 rounded-md p-4 mb-4">
                      <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                        {suggestion.suggestedReply}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleCopyAndOpen(suggestion)}
                        disabled={acting === suggestion.id}
                        className="bg-gold/20 text-gold hover:bg-gold/30 px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {copied === suggestion.id ? (
                          "Copied! Opening..."
                        ) : (
                          <>
                            <span>&#128203;</span> Copy &amp; Open
                          </>
                        )}
                      </button>
                      <button
                        onClick={() =>
                          handleAction(suggestion.id, "regenerate")
                        }
                        disabled={acting === suggestion.id}
                        className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {acting === suggestion.id ? "..." : "Regenerate"}
                      </button>
                      <button
                        onClick={() => handleAction(suggestion.id, "skip")}
                        disabled={acting === suggestion.id}
                        className="bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10 px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History Section */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-2 text-lg font-semibold text-white mb-4 hover:text-gold transition-colors"
          >
            <span
              className="text-sm transition-transform"
              style={{
                display: "inline-block",
                transform: historyOpen ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              &#9654;
            </span>
            History
            <span className="text-white/30 text-sm font-normal">
              ({history.length})
            </span>
          </button>

          {historyOpen && (
            <div className="space-y-3">
              {history.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="bg-white/[0.02] border border-white/5 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <PlatformIcon platform={suggestion.platform} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a
                          href={suggestion.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/60 text-sm font-semibold hover:text-white/80 transition-colors truncate"
                        >
                          {suggestion.postTitle}
                        </a>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            suggestion.status === "used"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-white/5 text-white/30"
                          }`}
                        >
                          {suggestion.status === "used" ? "Used" : "Skipped"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <PlatformBadge platform={suggestion.platform} />
                        <span className="text-white/20">&middot;</span>
                        <span className="text-white/30 text-xs">
                          by {suggestion.authorName} &middot;{" "}
                          {formatDate(suggestion.createdAt)}
                        </span>
                      </div>
                      <p className="text-white/40 text-xs mt-2 leading-relaxed line-clamp-2">
                        {suggestion.suggestedReply}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
