import Link from "next/link";
import { getAllPosts, type BlogPost } from "@/lib/blog";

export default function RelatedArticles({ currentSlug, currentTags }: { currentSlug: string; currentTags: string[] }) {
  const allPosts = getAllPosts();

  // Score posts by tag overlap, exclude current
  const scored = allPosts
    .filter((p) => p.slug !== currentSlug)
    .map((p) => ({
      ...p,
      score: p.tags.filter((t) => currentTags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score || (a.date > b.date ? -1 : 1))
    .slice(0, 3);

  if (scored.length === 0) return null;

  return (
    <div className="mt-12">
      <h3
        className="text-xl font-bold text-navy mb-6"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Related Articles
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {scored.map((post) => (
          <Link
            key={post.slug}
            href={`/trading-insights/${post.slug}`}
            className="group block rounded-lg overflow-hidden border border-gray-200 hover:border-gold/40 transition-colors"
          >
            {post.coverImage && (
              <div className="aspect-video overflow-hidden">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-4">
              <p className="text-sm font-bold text-navy group-hover:text-gold transition-colors line-clamp-2">
                {post.title}
              </p>
              <p className="text-xs text-gray-400 mt-1">{post.date}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
