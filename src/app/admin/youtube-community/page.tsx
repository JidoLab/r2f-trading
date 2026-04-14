"use client";

import { useEffect, useState } from "react";

interface CommunityPost {
  type: "poll" | "tip" | "question" | "behind-the-scenes" | "content-teaser";
  text: string;
  options?: string[];
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  poll: { label: "Poll", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: "📊" },
  tip: { label: "Trading Tip", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: "💡" },
  question: { label: "Question", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: "❓" },
  "behind-the-scenes": { label: "Behind the Scenes", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: "🎬" },
  "content-teaser": { label: "Content Teaser", color: "bg-gold/20 text-gold border-gold/30", icon: "🔥" },
};

export default function YouTubeCommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const fetchPosts = (isRefresh = false) => {
    if (isRefresh) setGenerating(true);
    else setLoading(true);

    fetch("/api/admin/youtube-community")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.suggestions) setPosts(d.suggestions);
        setLoading(false);
        setGenerating(false);
      })
      .catch(() => {
        setLoading(false);
        setGenerating(false);
      });
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const getFullText = (post: CommunityPost) => {
    if (post.type === "poll" && post.options) {
      return `${post.text}\n\nOptions:\n${post.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
    }
    return post.text;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Generating community post ideas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">YT Community Posts</h1>
          <p className="text-white/40 text-sm mt-1">
            AI-generated suggestions — copy and paste into YouTube Studio
          </p>
        </div>
        <button
          onClick={() => fetchPosts(true)}
          disabled={generating}
          className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-5 py-2.5 rounded-md transition-all disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate New"}
        </button>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post, i) => {
          const config = TYPE_CONFIG[post.type] || TYPE_CONFIG.tip;
          return (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-white/20 transition-colors"
            >
              {/* Type badge */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}
                >
                  <span>{config.icon}</span>
                  {config.label}
                </span>
                <button
                  onClick={() => copyToClipboard(getFullText(post), i)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                    copiedIdx === i
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {copiedIdx === i ? "Copied!" : "Copy"}
                </button>
              </div>

              {/* Post text */}
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                {post.text}
              </p>

              {/* Poll options */}
              {post.type === "poll" && post.options && (
                <div className="mt-3 space-y-2">
                  {post.options.map((option, oi) => (
                    <div
                      key={oi}
                      className="bg-white/[0.03] border border-white/5 rounded-md px-3 py-2 text-sm text-white/60"
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}

              {/* Character count */}
              <p className="text-white/20 text-xs mt-3">
                {post.text.length} characters
              </p>
            </div>
          );
        })}
      </div>

      {posts.length === 0 && !loading && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
          <p className="text-white/40 text-sm">No suggestions generated yet.</p>
          <button
            onClick={() => fetchPosts(true)}
            className="mt-4 bg-gold hover:bg-gold-light text-navy font-bold text-sm px-5 py-2.5 rounded-md transition-all"
          >
            Generate Posts
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-white/[0.03] border border-white/5 rounded-lg p-5">
        <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
          How to Post
        </h3>
        <ol className="text-white/40 text-sm space-y-1.5 list-decimal list-inside">
          <li>Copy a suggestion above</li>
          <li>
            Open{" "}
            <a
              href="https://studio.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:text-gold-light underline"
            >
              YouTube Studio
            </a>
          </li>
          <li>Click &quot;Create&quot; then &quot;Create post&quot;</li>
          <li>Paste the text and publish</li>
        </ol>
      </div>
    </div>
  );
}
