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

// Determine CTA based on post tags
function getBlogCTA(tags: string[], title: string) {
  const lower = tags.map(t => t.toLowerCase()).join(" ") + " " + title.toLowerCase();

  if (lower.includes("funded") || lower.includes("ftmo") || lower.includes("prop firm") || lower.includes("challenge")) {
    return {
      headline: "Ready to Get Funded?",
      text: "Our students pass prop firm challenges in under 60 days with personalized ICT coaching.",
      buttonText: "Book a Free Discovery Call",
      buttonUrl: "/contact",
      secondaryText: "Or start with our $49 Starter Kit →",
      secondaryUrl: "/starter-kit",
    };
  }

  if (lower.includes("psychology") || lower.includes("mindset") || lower.includes("discipline") || lower.includes("emotion")) {
    return {
      headline: "Master Your Trading Psychology",
      text: "Psychology is 80% of trading. Our coaching includes dedicated psychological coaching sessions.",
      buttonText: "See Coaching Plans",
      buttonUrl: "/coaching",
      secondaryText: "Start free: 5-Day ICT Crash Course →",
      secondaryUrl: "/crash-course",
    };
  }

  if (lower.includes("risk") || lower.includes("position size") || lower.includes("drawdown")) {
    return {
      headline: "Build a Risk Management Plan That Works",
      text: "Get a custom risk management framework built for YOUR account size and trading style.",
      buttonText: "Book a Free Call",
      buttonUrl: "/contact",
      secondaryText: "Free: Risk/Reward Calculator →",
      secondaryUrl: "/tools/risk-calculator",
    };
  }

  if (lower.includes("beginner") || lower.includes("start") || lower.includes("learn") || lower.includes("basic")) {
    return {
      headline: "New to ICT Trading?",
      text: "Start with our free 5-day crash course. Learn the 3 setups that actually work.",
      buttonText: "Start Free Crash Course",
      buttonUrl: "/crash-course",
      secondaryText: "Or grab the free checklist →",
      secondaryUrl: "/free-class",
    };
  }

  // Default CTA
  return {
    headline: "Take Your Trading to the Next Level",
    text: "Get personalized 1-on-1 ICT coaching with Harvest Wright. Free discovery call, no commitment.",
    buttonText: "Book a Free Discovery Call",
    buttonUrl: "/contact",
    secondaryText: "Learn more about coaching →",
    secondaryUrl: "/coaching",
  };
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
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: "Harvest Wright",
      url: "https://www.r2ftrading.com/about",
      jobTitle: "ICT Trading Coach",
      sameAs: [
        "https://x.com/Road2Funded",
        "https://www.tradingview.com/u/HarvestSignals/",
      ],
      knowsAbout: ["ICT trading", "forex coaching", "prop firm challenges", "trading psychology"],
    },
    publisher: {
      "@type": "Organization",
      name: "R2F Trading",
      url: "https://www.r2ftrading.com",
      logo: {
        "@type": "ImageObject",
        url: "https://www.r2ftrading.com/favicon.png",
      },
    },
    keywords: post.seoKeywords?.join(", "),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://www.r2ftrading.com/trading-insights/${slug}`,
    },
  };

  // Generate FAQ schema for FAQ-type posts (extract Q&A pairs from content)
  let faqLd: Record<string, unknown> | null = null;
  if (post.postType === "faq") {
    // Extract bold questions followed by answers from the body
    const faqRegex = /\*\*(.+?)\*\*\s*\n\n([^*#]+?)(?=\n\n\*\*|\n\n##|\n*$)/g;
    const faqItems: { question: string; answer: string }[] = [];
    let faqMatch;
    while ((faqMatch = faqRegex.exec(rawContent)) !== null && faqItems.length < 10) {
      const q = faqMatch[1].replace(/\??\s*$/, "?").trim();
      const a = faqMatch[2].trim().slice(0, 500);
      if (q.length > 10 && a.length > 20) {
        faqItems.push({ question: q, answer: a });
      }
    }
    if (faqItems.length >= 2) {
      faqLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      };
    }
  }

  // Generate HowTo schema for how-to/checklist posts (extract steps from numbered lists)
  let howToLd: Record<string, unknown> | null = null;
  if (post.postType === "how-to" || post.postType === "checklist") {
    const stepRegex = /^\d+\.\s+\*\*(.+?)\*\*(?:\s*[-–—:]\s*)?(.+)?$/gm;
    const steps: { name: string; text: string }[] = [];
    let stepMatch;
    while ((stepMatch = stepRegex.exec(rawContent)) !== null && steps.length < 15) {
      steps.push({
        name: stepMatch[1].trim(),
        text: (stepMatch[2] || stepMatch[1]).trim().slice(0, 300),
      });
    }
    if (steps.length >= 3) {
      howToLd = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: post.title,
        description: post.seoDescription || post.excerpt,
        step: steps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.name,
          text: s.text,
        })),
      };
    }
  }

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
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      {howToLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
        />
      )}

      <article className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-sm" itemScope itemType="https://schema.org/BreadcrumbList">
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link href="/" className="text-gray-400 hover:text-gold transition-colors" itemProp="item">
                  <span itemProp="name">Home</span>
                </Link>
                <meta itemProp="position" content="1" />
              </li>
              <span className="text-gray-300">/</span>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link href="/trading-insights" className="text-gray-400 hover:text-gold transition-colors" itemProp="item">
                  <span itemProp="name">Trading Insights</span>
                </Link>
                <meta itemProp="position" content="2" />
              </li>
              <span className="text-gray-300">/</span>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <span className="text-gray-600 truncate max-w-[250px] inline-block align-bottom" itemProp="name">{post.title}</span>
                <meta itemProp="position" content="3" />
              </li>
            </ol>
          </nav>

          {post.coverImage && (
            <img
              src={post.coverImage}
              alt={post.title}
              loading="eager"
              decoding="async"
              width={1200}
              height={675}
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

          {/* Author Bio */}
          <div className="my-10 bg-gray-50 border border-gray-200 rounded-lg p-6 flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-gold" style={{ fontFamily: "var(--font-heading)" }}>HW</span>
            </div>
            <div>
              <p className="text-navy font-bold text-sm">Harvest Wright</p>
              <p className="text-gray-500 text-xs mb-2">ICT Trading Coach &middot; 10+ Years Experience</p>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                Harvest specializes in ICT methodology and has helped traders pass prop firm challenges, develop consistent strategies, and build the psychology needed for long-term profitability.
              </p>
              <Link
                href="/contact"
                className="text-gold hover:text-gold-light text-sm font-bold transition-colors"
              >
                Book a Free Discovery Call &rarr;
              </Link>
            </div>
          </div>

          <hr className="my-12 border-gray-200" />

          {(() => {
            const cta = getBlogCTA(post.tags, post.title);
            return (
              <div className="bg-navy rounded-lg p-10 text-center">
                <p
                  className="text-2xl md:text-3xl font-bold text-white mb-3"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {cta.headline}
                </p>
                <p className="text-gray-300 text-sm mb-6 max-w-md mx-auto">
                  {cta.text}
                </p>
                <Link
                  href={cta.buttonUrl}
                  className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-wide px-8 py-3 rounded-md transition-all uppercase"
                >
                  {cta.buttonText}
                </Link>
                <div className="mt-4">
                  <Link
                    href={cta.secondaryUrl}
                    className="text-gold hover:text-gold-light text-sm font-medium transition-colors"
                  >
                    {cta.secondaryText}
                  </Link>
                </div>
              </div>
            );
          })()}

          <EmailSignup variant="sidebar" />

          <RelatedArticles currentSlug={slug} currentTags={post.tags} />
        </div>
      </article>

      <Footer />
    </main>
  );
}
