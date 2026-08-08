import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import Script from "next/script";
import { readFile, listFiles } from "@/lib/github";
import type { Metadata } from "next";

const BASE_URL = "https://www.r2ftrading.com";

interface LandingPageMeta {
  slug: string;
  title: string;
  seoDescription: string;
  targetKeyword: string;
  createdAt: string;
}

export const metadata: Metadata = {
  // Absolute: the brand suffix is already here, so the root layout template
  // must not append a second one.
  title: { absolute: "ICT Trading Glossary & Learning Hub | R2F Trading" },
  description:
    "Plain-English guides to ICT concepts — order blocks, fair value gaps, liquidity sweeps, killzones, prop-firm challenges and more. Learn the smart money method.",
  alternates: { canonical: "/learn" },
  openGraph: {
    title: "ICT Trading Glossary & Learning Hub",
    description:
      "Plain-English guides to every core ICT and smart money concept, from a 10-year practitioner.",
    url: "/learn",
    type: "website",
  },
};

async function getAllPages(): Promise<LandingPageMeta[]> {
  try {
    const files = await listFiles("data/landing-pages", ".json");
    const pages = await Promise.all(
      files.map(async (filePath) => {
        try {
          const raw = await readFile(filePath);
          const d = JSON.parse(raw);
          return {
            slug: d.slug,
            title: d.title,
            seoDescription: d.seoDescription,
            targetKeyword: d.targetKeyword,
            createdAt: d.createdAt,
          } as LandingPageMeta;
        } catch {
          return null;
        }
      })
    );
    return pages
      .filter((p): p is LandingPageMeta => p !== null)
      .sort((a, b) => a.title.localeCompare(b.title));
  } catch {
    return [];
  }
}

export default async function LearnHub() {
  const pages = await getAllPages();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "ICT Trading Glossary & Learning Hub",
    description:
      "Plain-English guides to every core ICT and smart money concept.",
    url: `${BASE_URL}/learn`,
    hasPart: pages.map((p) => ({
      "@type": "WebPage",
      name: p.title,
      url: `${BASE_URL}/learn/${p.slug}`,
    })),
  };

  return (
    <main>
      <Script
        id="json-ld-learn-hub"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-navy border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <ol className="flex flex-wrap items-center gap-2 text-xs text-white/50">
            <li>
              <Link href="/" className="hover:text-gold transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-white/80 font-medium" aria-current="page">
              Learn
            </li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-navy py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1
            className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            ICT Trading Learning Hub
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Plain-English breakdowns of every core ICT and smart money concept,
            from a trader with 10+ years in the game. Pick a topic and go deep.
          </p>
        </div>
      </section>

      {/* Glossary grid */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          {pages.length === 0 ? (
            <p className="text-center text-gray-500">
              New guides are being published. Check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pages.map((p) => (
                <Link
                  key={p.slug}
                  href={`/learn/${p.slug}`}
                  className="bg-gray-50 rounded-lg p-6 border border-gray-100 hover:border-gold/30 hover:shadow-md transition-all group"
                >
                  <p className="text-gold text-xs font-bold uppercase tracking-wider mb-2">
                    {p.targetKeyword}
                  </p>
                  <h2 className="text-navy font-bold mb-2 group-hover:text-gold transition-colors">
                    {p.title}
                  </h2>
                  <p className="text-gray-500 text-sm line-clamp-2">
                    {p.seoDescription}
                  </p>
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
