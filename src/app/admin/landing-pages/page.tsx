"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface LandingPage {
  slug: string;
  title: string;
  seoTitle: string;
  targetKeyword: string;
  createdAt: string;
}

export default function AdminLandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPages();
  }, []);

  async function fetchPages() {
    try {
      const res = await fetch("/api/admin/landing-pages");
      const data = await res.json();
      setPages(data.pages || []);
    } catch {
      setPages([]);
    }
    setLoading(false);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || !keyword.trim()) return;
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/admin/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), targetKeyword: keyword.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Generation failed");
      } else {
        setTopic("");
        setKeyword("");
        await fetchPages();
      }
    } catch {
      setError("Network error");
    }
    setGenerating(false);
  }

  async function handleDelete(slug: string, title: string) {
    if (!confirm(`Delete landing page "${title}"? This cannot be undone.`)) return;

    const res = await fetch("/api/admin/landing-pages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });

    if (res.ok) {
      setPages((prev) => prev.filter((p) => p.slug !== slug));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Failed to delete: ${data.error || "Unknown error"}`);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Landing Pages</h1>
        <span className="text-white/30 text-sm">{pages.length} pages</span>
      </div>

      {/* Generate Form */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-bold text-gold mb-4">Generate New Landing Page</h2>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-1.5">
                Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. How to identify and trade ICT order blocks"
                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-gold/50"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-1.5">
                Target Keyword
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. ICT order blocks"
                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
          <button
            type="submit"
            disabled={generating || !topic.trim() || !keyword.trim()}
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-2.5 rounded-md transition-all uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Generating..." : "Generate Landing Page"}
          </button>
        </form>
      </div>

      {/* Pages List */}
      {loading ? (
        <p className="text-white/40">Loading...</p>
      ) : pages.length === 0 ? (
        <p className="text-white/40">No landing pages yet. Generate one above.</p>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">
                  Keyword
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr
                  key={page.slug}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4">
                    <p className="text-white/90 text-sm font-medium">{page.title}</p>
                    <p className="text-white/30 text-xs mt-0.5">/learn/{page.slug}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-2 py-0.5 rounded">
                      {page.targetKeyword}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/50 text-sm">
                    {page.createdAt
                      ? new Date(page.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/learn/${page.slug}`}
                        target="_blank"
                        className="text-white/40 hover:text-white text-xs transition-colors"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(page.slug, page.title)}
                        className="text-red-400/50 hover:text-red-400 text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
