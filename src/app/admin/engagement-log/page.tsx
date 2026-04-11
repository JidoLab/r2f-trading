"use client";

import { useEffect, useState } from "react";

interface RedditEntry {
  postId: string;
  subreddit: string;
  postTitle: string;
  commentText: string;
  mentionedR2F: boolean;
  commentedAt: string;
  permalink?: string;
}

interface TwitterEntry {
  tweetId: string;
  originalText: string;
  replyText: string;
  authorUsername?: string;
  mentionedR2F: boolean;
  repliedAt: string;
  tweetUrl?: string;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      timeZone: "Asia/Bangkok",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function EngagementLogPage() {
  const [reddit, setReddit] = useState<RedditEntry[]>([]);
  const [twitter, setTwitter] = useState<TwitterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"reddit" | "twitter">("reddit");

  useEffect(() => {
    fetch("/api/admin/engagement-log")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setReddit(d.reddit || []);
          setTwitter(d.twitter || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Engagement Log</h1>
        <p className="text-white/40 text-sm mt-1">
          All automated Reddit comments and Twitter replies
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Reddit Comments</p>
          <p className="text-3xl font-black text-orange-400">{reddit.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Twitter Replies</p>
          <p className="text-3xl font-black text-blue-400">{twitter.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Student Mentions</p>
          <p className="text-3xl font-black text-gold">
            {reddit.filter((r) => r.mentionedR2F).length + twitter.filter((t) => t.mentionedR2F).length}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Total Engagement</p>
          <p className="text-3xl font-black text-white">{reddit.length + twitter.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("reddit")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            tab === "reddit" ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-white/40 hover:text-white/60"
          }`}
        >
          Reddit ({reddit.length})
        </button>
        <button
          onClick={() => setTab("twitter")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            tab === "twitter" ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-white/40 hover:text-white/60"
          }`}
        >
          Twitter ({twitter.length})
        </button>
      </div>

      {/* Reddit Tab */}
      {tab === "reddit" && (
        <div className="space-y-3">
          {reddit.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
              <p className="text-white/40 text-sm">No Reddit comments yet. The cron runs 2x/day.</p>
            </div>
          ) : (
            reddit.map((entry, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        r/{entry.subreddit}
                      </span>
                      {entry.mentionedR2F && (
                        <span className="bg-gold/20 text-gold text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Students mentioned
                        </span>
                      )}
                      <span className="text-white/30 text-xs">{formatDate(entry.commentedAt)}</span>
                    </div>
                    <p className="text-white/70 text-sm font-medium truncate">{entry.postTitle}</p>
                  </div>
                  {entry.permalink && (
                    <a
                      href={`https://reddit.com${entry.permalink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 text-xs font-bold shrink-0 hover:text-orange-300"
                    >
                      View ↗
                    </a>
                  )}
                </div>
                <div className="bg-white/5 rounded-md p-3">
                  <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{entry.commentText}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Twitter Tab */}
      {tab === "twitter" && (
        <div className="space-y-3">
          {twitter.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
              <p className="text-white/40 text-sm">No Twitter replies yet. The cron runs 1x/day.</p>
            </div>
          ) : (
            twitter.map((entry, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Twitter/X
                      </span>
                      {entry.authorUsername && (
                        <span className="text-white/40 text-xs">@{entry.authorUsername}</span>
                      )}
                      {entry.mentionedR2F && (
                        <span className="bg-gold/20 text-gold text-[10px] font-bold px-2 py-0.5 rounded-full">
                          R2F mentioned
                        </span>
                      )}
                      <span className="text-white/30 text-xs">{formatDate(entry.repliedAt)}</span>
                    </div>
                    <p className="text-white/50 text-xs italic truncate">Original: {entry.originalText}</p>
                  </div>
                  {entry.tweetUrl && (
                    <a
                      href={entry.tweetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-xs font-bold shrink-0 hover:text-blue-300"
                    >
                      View ↗
                    </a>
                  )}
                </div>
                <div className="bg-white/5 rounded-md p-3">
                  <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{entry.replyText}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
