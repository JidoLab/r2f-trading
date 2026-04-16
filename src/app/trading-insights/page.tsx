import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trading Insights & ICT Education",
  description: "Free ICT trading articles, market analysis, and educational content. Learn order blocks, fair value gaps, liquidity sweeps, and prop firm strategies.",
  alternates: { canonical: "/trading-insights" },
  openGraph: {
    title: "Trading Insights — R2F Trading",
    description: "Free ICT trading education, market analysis, and strategies for funded traders.",
    url: "/trading-insights",
  },
};

export default function TradingInsightsPage() {
  const posts = getAllPosts();

  return (
    <main>
      <Header />

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h1
            className="text-4xl md:text-5xl font-bold text-navy mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Trading Insights
          </h1>
          <p className="text-gray-600 leading-relaxed max-w-3xl mb-12">
            Market analysis, educational content, and trading strategies to help you on your journey to consistent profitability.
          </p>

          {posts.length === 0 ? (
            <div className="bg-cream rounded-lg p-12 text-center">
              <p className="text-navy/60 text-lg italic" style={{ fontFamily: "var(--font-serif)" }}>
                New articles coming soon...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/trading-insights/${post.slug}`}
                  className="group block rounded-lg overflow-hidden border border-gray-200 hover:border-gold/40 transition-colors"
                >
                  <div className="aspect-video overflow-hidden bg-gray-100">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        loading="lazy"
                        decoding="async"
                        width={640}
                        height={360}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-navy flex items-center justify-center">
                        <span className="text-4xl font-black text-gold/30" style={{ fontFamily: "var(--font-heading)" }}>R2F</span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <time className="text-xs text-gray-400">{post.date}</time>
                      {post.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-2 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-lg font-bold text-navy mb-2 group-hover:text-gold transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                    <span className="inline-block mt-4 text-sm font-bold text-gold uppercase tracking-wide">
                      Read More &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
