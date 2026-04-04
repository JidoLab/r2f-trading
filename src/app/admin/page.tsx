import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

export default function AdminDashboard() {
  const posts = getAllPosts();
  const latestPost = posts[0];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <p className="text-white/40 text-sm mb-1">Total Posts</p>
          <p className="text-3xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>
            {posts.length}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <p className="text-white/40 text-sm mb-1">Latest Post</p>
          <p className="text-sm text-white/80 truncate">
            {latestPost?.title || "No posts yet"}
          </p>
          {latestPost && (
            <p className="text-xs text-white/30 mt-1">{latestPost.date}</p>
          )}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <p className="text-white/40 text-sm mb-1">Analytics</p>
          <a
            href="https://vercel.com/wrightharvest-9811s-projects/r2f-trading/analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold text-sm hover:text-gold-light transition-colors"
          >
            View in Vercel ↗
          </a>
        </div>
      </div>

      <div className="flex gap-4 mb-10">
        <Link
          href="/admin/posts"
          className="bg-white/5 border border-white/10 hover:border-gold/40 text-white font-semibold text-sm px-6 py-3 rounded-md transition-colors"
        >
          Manage Posts
        </Link>
        <Link
          href="/admin/posts/generate"
          className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-3 rounded-md transition-all uppercase tracking-wide"
        >
          Generate New Post
        </Link>
      </div>

      {posts.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Recent Posts</h2>
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            {posts.slice(0, 5).map((post) => (
              <div
                key={post.slug}
                className="flex items-center justify-between px-6 py-4 border-b border-white/5 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-white/90 text-sm font-medium truncate">{post.title}</p>
                  <p className="text-white/30 text-xs mt-0.5">{post.date}</p>
                </div>
                <Link
                  href={`/admin/posts/${post.slug}/edit`}
                  className="text-gold text-xs font-bold hover:text-gold-light transition-colors ml-4"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
