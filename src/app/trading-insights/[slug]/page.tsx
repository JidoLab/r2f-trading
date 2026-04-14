import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EmailSignup from "@/components/EmailSignup";
import RelatedArticles from "@/components/RelatedArticles";
import ShareButtons from "@/components/ShareButtons";
import ReadingTime from "@/components/ReadingTime";
import TableOfContents from "@/components/TableOfContents";
import PageTracker from "@/components/PageTracker";
import Link from "next/link";
import { getAllSlugs, getPostBySlug, getRawContent } from "@/lib/blog";
import type { Metadata } from "next";
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post.seoTitle || `${post.title} | R2F Trading`;
  const description = post.seoDescription || post.excerpt;
  return {
    title,
    description,
    keywords: post.seoKeywords,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
      siteName: "R2F Trading",
      images: post.coverImage ? [{ url: post.coverImage, width: 1200, height: 630, alt: post.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: post.coverImage ? [post.coverImage] : [],
    },
    alternates: {
      canonical: `https://www.r2ftrading.com/trading-insights/${slug}`,
    },
  };
}

async function getMDXContent(slug: string) {
  // Dynamic import from content directory
  const mod = await import(`../../../../content/blog/${slug}.mdx`);
  return mod.default;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const rawContent = getRawContent(slug);
  const Content = await getMDXContent(slug);

  // Extract all images from article body for ImageObject schema
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const bodyImages: { alt: string; url: string }[] = [];
  let imgMatch;
  while ((imgMatch = imageRegex.exec(rawContent)) !== null) {
    const [, alt, url] = imgMatch;
    const fullUrl = url.startsWith("http") ? url : `https://www.r2ftrading.com${url}`;
    bodyImages.push({ alt: alt || post.title, url: fullUrl });
  }

  // Add cover image to the list if present
  if (post.coverImage) {
    const coverUrl = post.coverImage.startsWith("http")
      ? post.coverImage
      : `https://www.r2ftrading.com${post.coverImage}`;
    bodyImages.unshift({ alt: post.title, url: coverUrl });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.coverImage
      ? (post.coverImage.startsWith("http") ? post.coverImage : `https://www.r2ftrading.com${post.coverImage}`)
      : undefined,
    datePublished: post.date,
    author: { "@type": "Person", name: "Harvest Wright", url: "https://www.r2ftrading.com/about" },
    publisher: { "@type": "Organization", name: "R2F Trading", url: "https://www.r2ftrading.com" },
    keywords: post.seoKeywords?.join(", "),
  };

  const imageObjectsLd = bodyImages.map((img) => ({
    "@context": "https://schema.org",
    "@type": "ImageObject",
    url: img.url,
    caption: img.alt,
    creator: { "@type": "Person", name: "Harvest Wright" },
    copyrightHolder: { "@type": "Organization", name: "R2F Trading" },
  }));

  return (
    <main>
      <Header />
      <PageTracker event="blog_read" data={{ slug }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {imageObjectsLd.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(imageObjectsLd) }}
        />
      )}

      <article className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <Link
            href="/trading-insights"
            className="text-sm text-gold hover:text-gold-light font-bold uppercase tracking-wide mb-8 inline-block"
          >
            &larr; Back to Insights
          </Link>

          {post.coverImage && (
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full rounded-lg mb-8 aspect-video object-cover"
            />
          )}

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <time className="text-sm text-gray-400">{post.date}</time>
            <span className="text-gray-300">·</span>
            <ReadingTime content={rawContent} />
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1
            className="text-3xl md:text-5xl font-bold text-navy mb-8 leading-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {post.title}
          </h1>

          <TableOfContents content={rawContent} />

          <div>
            <Content />
          </div>

          <ShareButtons slug={slug} title={post.title} />

          <hr className="my-12 border-gray-200" />

          <div className="bg-cream rounded-lg p-8 text-center">
            <p
              className="text-xl font-bold text-navy mb-3"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Ready to take your trading to the next level?
            </p>
            <p className="text-gray-600 text-sm mb-6">
              Get personalized coaching from an experienced ICT trader.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-wide px-8 py-3 rounded-md transition-all uppercase"
            >
              Book a Free Discovery Call
            </Link>
          </div>

          <EmailSignup variant="sidebar" />

          <RelatedArticles currentSlug={slug} currentTags={post.tags} />
        </div>
      </article>

      <Footer />
    </main>
  );
}
