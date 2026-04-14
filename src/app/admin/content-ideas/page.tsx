"use client";

import { useEffect, useState } from "react";

interface ContentIdea {
  id: string;
  source: "reddit";
  postTitle: string;
  ourComment: string;
  score: number;
  suggestedTopic: string;
  suggestedAngle: string;
  date: string;
  subreddit: string;
  permalink?: string;
  generated?: boolean;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      timeZone: "Asia/Bangkok",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function ContentIdeasPage() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; title?: string; error?: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/content-ideas")
      .then((r) => r.json())
      .then((d) => setIdeas(d.ideas || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate(id: string) {
    setGenerating(id);
    setResult(null);
    try {
      const res = await fetch("/api/admin/content-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", id }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ id, title: data.title });
        setIdeas((prev) =>
          prev.map((i) => (i.id === id ? { ...i, generated: true } : i))
        );
      } else {
        setResult({ id, error: data.error || "Failed" });
      }
    } catch (err) {
      setResult({ id, error: String(err) });
    } finally {
      setGenerating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Ideas</h1>
          <p className="text-sm text-white/50 mt-1">
            Blog topics from high-performing Reddit comments
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-gold/10 text-gold text-sm font-medium">
          {ideas.length} idea{ideas.length !== 1 ? "s" : ""}
        </div>
      </div>

      {ideas.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <p className="text-white/40 text-lg">No content ideas yet</p>
          <p className="text-white/30 text-sm mt-2">
            Ideas are generated weekly from Reddit comments that get 5+ upvotes
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className={`bg-white/5 border rounded-xl p-6 transition-colors ${
                idea.generated
                  ? "border-green-500/20 bg-green-500/5"
                  : "border-white/10 hover:border-gold/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Topic */}
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {idea.suggestedTopic}
                  </h3>
                  <p className="text-sm text-white/50 mb-4">
                    {idea.suggestedAngle}
                  </p>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
                    <span className="px-2 py-1 rounded bg-orange-500/10 text-orange-400 font-medium">
                      r/{idea.subreddit}
                    </span>
                    <span className="px-2 py-1 rounded bg-gold/10 text-gold font-medium">
                      {idea.score} upvotes
                    </span>
                    <span className="text-white/30">{formatDate(idea.date)}</span>
                    {idea.generated && (
                      <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 font-medium">
                        Blog Generated
                      </span>
                    )}
                  </div>

                  {/* Original post */}
                  <div className="bg-white/5 rounded-lg p-4 mb-3">
                    <div className="text-xs text-white/30 uppercase tracking-wider mb-1">
                      Original Post
                    </div>
                    <p className="text-sm text-white/70">{idea.postTitle}</p>
                  </div>

                  {/* Our comment */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-xs text-white/30 uppercase tracking-wider mb-1">
                      Our Comment
                    </div>
                    <p className="text-sm text-white/60 line-clamp-3">
                      {idea.ourComment}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  {!idea.generated ? (
                    <button
                      onClick={() => handleGenerate(idea.id)}
                      disabled={generating === idea.id}
                      className="px-4 py-2 rounded-lg bg-gold text-navy font-semibold text-sm hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {generating === idea.id
                        ? "Generating..."
                        : "Generate Blog Post"}
                    </button>
                  ) : (
                    <span className="px-4 py-2 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium text-center">
                      Generated
                    </span>
                  )}
                  {idea.permalink && (
                    <a
                      href={`https://reddit.com${idea.permalink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg border border-white/10 text-white/50 text-sm text-center hover:text-white hover:border-white/20 transition-colors"
                    >
                      View on Reddit
                    </a>
                  )}
                </div>
              </div>

              {/* Result feedback */}
              {result?.id === idea.id && (
                <div
                  className={`mt-4 p-3 rounded-lg text-sm ${
                    result.error
                      ? "bg-red-500/10 text-red-400"
                      : "bg-green-500/10 text-green-400"
                  }`}
                >
                  {result.error
                    ? `Error: ${result.error}`
                    : `Blog post created: "${result.title}"`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
