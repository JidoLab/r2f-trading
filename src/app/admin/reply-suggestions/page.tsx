"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ReplySuggestion {
  id: string;
  platform: "youtube";
  postTitle: string;
  postUrl: string;
  authorName: string;
  suggestedReply: string;
  createdAt: string;
  status: "pending" | "used" | "skipped";
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "youtube") {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-600/20 text-red-400 text-sm font-bold shrink-0">
        YT
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white/60 text-sm font-bold shrink-0">
      ?
    </span>
  );
}

export default function ReplySuggestionsPage() {
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const pending = suggestions.filter((s) => s.status === "pending");
  const history = suggestions.filter((s) => s.status !== "pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Reply Suggestions</h1>
          <p className="text-white/50 text-sm">
            {pending.length} pending &middot; {history.length} in history
          </p>
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
                    <div className="flex items-center gap-2 mb-3">
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
                      <span className="text-white/30 text-xs">
                        by {suggestion.authorName} &middot;{" "}
                        {formatDate(suggestion.createdAt)}
                      </span>
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
