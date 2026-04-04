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

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/posts")
      .then((r) => r.json())
      .then((data) => { setPosts(data.posts); setLoading(false); });
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
      ) : posts.length === 0 ? (
        <p className="text-white/40">No posts yet. Generate your first one!</p>
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
    </div>
  );
}
