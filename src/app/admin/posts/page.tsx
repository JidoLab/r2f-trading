"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AutoGenerateToggle from "@/components/AutoGenerateToggle";

interface Post {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  coverImage: string;
}

interface Draft {
  slug: string;
  title: string;
  date: string;
  tags: string[];
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/posts").then((r) => r.json()),
      fetch("/api/admin/drafts").then((r) => r.json()),
    ]).then(([postsData, draftsData]) => {
      setPosts(postsData.posts || []);
      setDrafts(draftsData.drafts || []);
      setLoading(false);
    });
  }, []);

  async function handleDelete(slug: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/posts/${slug}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Failed to delete post: ${data.error || res.statusText}`);
    }
  }

  async function handleShareToSocials(slug: string) {
    setSharing(slug);
    const res = await fetch(`/api/admin/posts/${slug}/share`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      const successes = data.results?.filter((r: { status: string }) => r.status === "success").length || 0;
      const total = data.results?.length || 0;
      alert(`Shared to ${successes}/${total} platforms`);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Failed to share: ${data.error || "Unknown error"}`);
    }
    setSharing(null);
  }

  async function handlePublish(slug: string, withSocials: boolean) {
    setPublishing(slug);
    const res = await fetch(`/api/admin/posts/${slug}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withSocials }),
    });

    if (res.ok) {
      // Move from drafts to posts in UI
      const draft = drafts.find((d) => d.slug === slug);
      setDrafts((prev) => prev.filter((d) => d.slug !== slug));
      if (draft) {
        setPosts((prev) => [{ ...draft, coverImage: "" }, ...prev]);
      }
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Failed to publish: ${data.error || res.statusText}`);
    }
    setPublishing(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Blog Posts</h1>
        <Link
          href="/admin/posts/generate"
          className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-2.5 rounded-md transition-all uppercase tracking-wide"
        >
          + Generate Post
        </Link>
      </div>

      <AutoGenerateToggle />

      {loading ? (
        <p className="text-white/40">Loading...</p>
      ) : (
        <>
          {/* Drafts Section */}
          {drafts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                Drafts ({drafts.length})
              </h2>
              <div className="bg-gold/5 border border-gold/20 rounded-lg overflow-hidden">
                {drafts.map((draft) => (
                  <div
                    key={draft.slug}
                    className="flex items-center justify-between px-6 py-4 border-b border-gold/10 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-white/90 text-sm font-medium">{draft.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-gold/60 text-xs">Draft</span>
                        <span className="text-white/30 text-xs">{draft.date}</span>
                        {draft.tags.map((tag) => (
                          <span key={tag} className="text-[9px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link
                        href={`/admin/posts/${draft.slug}/edit`}
                        className="text-white/40 hover:text-white text-xs transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handlePublish(draft.slug, false)}
                        disabled={publishing === draft.slug}
                        className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                      >
                        {publishing === draft.slug ? "..." : "Publish"}
                      </button>
                      <button
                        onClick={() => handlePublish(draft.slug, true)}
                        disabled={publishing === draft.slug}
                        className="bg-gold hover:bg-gold-light text-navy text-xs font-bold px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                      >
                        {publishing === draft.slug ? "..." : "Publish + Socials"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Published Posts */}
          <h2 className="text-lg font-bold text-white mb-3">Published ({posts.length})</h2>
          {posts.length === 0 ? (
            <p className="text-white/40">No published posts yet.</p>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider">Tags</th>
                    <th className="px-6 py-3 text-xs font-bold text-white/40 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.slug} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <p className="text-white/90 text-sm font-medium">{post.title}</p>
                        <p className="text-white/30 text-xs mt-0.5 truncate max-w-xs">{post.slug}</p>
                      </td>
                      <td className="px-6 py-4 text-white/50 text-sm">{post.date}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {post.tags.map((tag) => (
                            <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-2 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/trading-insights/${post.slug}`}
                            target="_blank"
                            className="text-white/40 hover:text-white text-xs transition-colors"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleShareToSocials(post.slug)}
                            disabled={sharing === post.slug}
                            className="text-blue-400/70 hover:text-blue-400 text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {sharing === post.slug ? "Sharing..." : "Share"}
                          </button>
                          <Link
                            href={`/admin/posts/${post.slug}/edit`}
                            className="text-gold text-xs font-bold hover:text-gold-light transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(post.slug, post.title)}
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
        </>
      )}
    </div>
  );
}
