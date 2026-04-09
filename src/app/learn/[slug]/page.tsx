import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EmailSignup from "@/components/EmailSignup";
import PageTracker from "@/components/PageTracker";
import Script from "next/script";
import Link from "next/link";
import { readFile, listFiles } from "@/lib/github";
import { getAllPosts } from "@/lib/blog";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const BASE_URL = "https://www.r2ftrading.com";

interface LandingPageData {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  headline: string;
  subheadline: string;
  keyPoints: { icon: string; title: string; text: string }[];
  relatedTags: string[];
  testimonialIndex: number;
  createdAt: string;
  targetKeyword: string;
}

const TESTIMONIALS = [
  {
    quote: "Before working with R2F, I constantly second-guessed every decision I made. Now I can actually see consistent and gradual growth on my accounts!",
    name: "T.W.",
  },
  {
    quote: "What stood out to me was how tailored the mentorship was. R2F didn't just give me generic strategies but truly focused on my strengths and weaknesses.",
    name: "M.L.",
  },
  {
    quote: "I tried learning ICT on my own, but I was overwhelmed. Harvest broke down the concepts in an easy-to-follow way.",
    name: "H.C.",
  },
  {
    quote: "R2F's mentorship on scaling and risk management was a big lightbulb moment for me. I'm not only keeping my funded account but steadily growing it.",
    name: "A.S.",
  },
];

async function getPageData(slug: string): Promise<LandingPageData | null> {
  try {
    const raw = await readFile(`data/landing-pages/${slug}.json`);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPageData(slug);
  if (!data) return { title: "Not Found" };

  return {
    title: data.seoTitle,
    description: data.seoDescription,
    alternates: { canonical: `/learn/${slug}` },
    openGraph: {
      title: data.seoTitle,
      description: data.seoDescription,
      url: `/learn/${slug}`,
      type: "website",
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPageData(slug);
  if (!data) notFound();

  // Find related blog posts by matching tags
  const allPosts = getAllPosts();
  const relatedPosts = allPosts
    .filter((post) =>
      post.tags.some((tag) =>
        data.relatedTags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
      )
    )
    .slice(0, 3);

  const testimonial = TESTIMONIALS[data.testimonialIndex % TESTIMONIALS.length];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.seoTitle,
    description: data.seoDescription,
    url: `${BASE_URL}/learn/${slug}`,
    publisher: {
      "@type": "Organization",
      name: "R2F Trading",
      url: BASE_URL,
    },
    author: {
      "@type": "Person",
      name: "Harvest Wright",
    },
    datePublished: data.createdAt,
  };

  return (
    <main>
      <Script
        id={`json-ld-learn-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <PageTracker event="landing_page_view" />

      {/* Hero */}
      <section className="bg-navy py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-block bg-gold/20 text-gold text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-6">
            {data.targetKeyword}
          </span>
          <h1
            className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {data.headline}
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
            {data.subheadline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-8 py-3 rounded-md transition-all uppercase tracking-wide inline-block"
            >
              Book a Free Discovery Call
            </Link>
            <Link
              href="/free-class"
              className="border border-white/20 hover:border-white/40 text-white font-semibold text-sm px-8 py-3 rounded-md transition-all inline-block"
            >
              Join Free Class
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="bg-gold py-4">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-8 text-center">
          {[
            { value: "50+", label: "Students Coached" },
            { value: "10+", label: "Years Experience" },
            { value: "85%", label: "Funding Rate" },
            { value: "Top 1%", label: "Competition Rank" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-navy text-xl font-black">{s.value}</p>
              <p className="text-navy/70 text-[10px] font-semibold uppercase tracking-wide">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Key Points */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl font-bold text-navy text-center mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {data.title}
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            Everything you need to know, broken down by a 10-year ICT practitioner.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.keyPoints.map((point) => (
              <div
                key={point.title}
                className="bg-gray-50 rounded-lg p-6 border border-gray-100"
              >
                <div className="text-3xl mb-3">{point.icon}</div>
                <h3 className="text-navy font-bold text-lg mb-2">
                  {point.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {point.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 md:py-20 bg-cream">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="flex justify-center gap-0.5 mb-4">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-gold text-lg">
                ★
              </span>
            ))}
          </div>
          <blockquote
            className="text-navy text-xl md:text-2xl font-medium italic mb-4 leading-relaxed"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            &ldquo;{testimonial.quote}&rdquo;
          </blockquote>
          <p className="text-navy/50 text-sm font-bold">
            &mdash; {testimonial.name}, R2F Trading Student
          </p>
        </div>
      </section>

      {/* Related Blog Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <h2
              className="text-2xl font-bold text-navy text-center mb-10"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Related Trading Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/trading-insights/${post.slug}`}
                  className="bg-gray-50 rounded-lg p-6 border border-gray-100 hover:border-gold/30 hover:shadow-md transition-all group"
                >
                  <p className="text-gold text-xs font-bold uppercase tracking-wider mb-2">
                    {post.tags[0] || "Trading"}
                  </p>
                  <h3 className="text-navy font-bold mb-2 group-hover:text-gold transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-500 text-sm line-clamp-2">
                    {post.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Email Signup */}
      <section className="py-16 md:py-24 bg-navy">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-2xl md:text-3xl font-black text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Get the Free ICT Trading Checklist
          </h2>
          <p className="text-white/50 text-sm mb-8 max-w-xl mx-auto">
            Download the exact checklist our funded traders use before every
            trade. Plus get weekly ICT insights straight to your inbox.
          </p>
          <div className="max-w-md mx-auto">
            <EmailSignup variant="inline" />
          </div>
          <p className="text-white/20 text-xs mt-4">
            100% free. No credit card. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 bg-[#0a1628]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-2xl md:text-3xl font-black text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Ready to Trade With Confidence?
          </h2>
          <p className="text-white/50 text-sm mb-8">
            Book a free discovery call with Harvest and find out which coaching
            plan is right for your trading level.
          </p>
          <Link
            href="/contact"
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-10 py-3.5 rounded-md transition-all uppercase tracking-wide inline-block"
          >
            Book Your Free Call
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
