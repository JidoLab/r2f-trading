import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EmailSignup from "@/components/EmailSignup";
import PageTracker from "@/components/PageTracker";
import Script from "next/script";
import Link from "next/link";
import type { Metadata } from "next";
import { seoTitle, seoDescription } from "@/lib/seo";
import { HANDBOOK } from "@/lib/handbook";

export const metadata: Metadata = {
  title: seoTitle("Between the Stop and the Target: Trader Affirmations"),
  description: seoDescription(
    "A trader's affirmation handbook: 137 short readings for the moments that test every trader, from pre-open nerves to failing a funded challenge. Read five chapters free."
  ),
  keywords: ["trading affirmations", "trading psychology book", "trader mindset", "day trading psychology", "funded challenge mindset", "trading discipline"],
  alternates: { canonical: "/handbook" },
  openGraph: {
    title: "Between the Stop and the Target | R2F Trading",
    description: "137 short readings for the moments that test every trader. Five chapters free, paperback and Kindle on Amazon.",
    url: "https://www.r2ftrading.com/handbook",
    images: [{ url: "https://www.r2ftrading.com/handbook/cover.jpg", width: 900, height: 1350 }],
  },
};

const MOMENTS = [
  "Waking up to a move you were not in",
  "The morning after a bad day",
  "Exiting early and watching it run to target",
  "Stopped out at the exact turn",
  "Failing an evaluation, and failing again",
  "Breaching on a technicality",
  "Trading around a full-time job",
  "When your partner worries",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Book",
  name: HANDBOOK.title,
  alternateName: HANDBOOK.subtitle,
  author: { "@type": "Person", name: "Harvest Wright" },
  image: "https://www.r2ftrading.com/handbook/cover.jpg",
  numberOfPages: HANDBOOK.pages,
  inLanguage: "en",
  genre: "Trading psychology",
  url: "https://www.r2ftrading.com/handbook",
  ...(HANDBOOK.amazonPaperback ? { offers: { "@type": "Offer", url: HANDBOOK.amazonPaperback, availability: "https://schema.org/InStock" } } : {}),
};

export default function HandbookPage() {
  const onAmazon = !!(HANDBOOK.amazonPaperback || HANDBOOK.amazonKindle);
  return (
    <main>
      <Script id="json-ld-handbook" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <PageTracker event="handbook_page_view" />

      {/* Hero */}
      <section className="bg-navy py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[320px_1fr] gap-10 items-center">
          <div className="mx-auto w-64 md:w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/handbook/cover.jpg" alt={`${HANDBOOK.title} book cover`} width={900} height={1350} className="w-full rounded-md shadow-2xl" />
          </div>
          <div className="text-center md:text-left">
            <span className="inline-block bg-gold/20 text-gold text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-5">
              New book
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-3 leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
              {HANDBOOK.title}
            </h1>
            <p className="text-gold text-lg mb-5">{HANDBOOK.subtitle}</p>
            <p className="text-white/60 leading-relaxed mb-8">
              {HANDBOOK.pages} pages, {HANDBOOK.chapters} short readings, one for each moment that tests a trader. Each one says when to read it, what is going on in your head, and the words to hold onto. Illustrated throughout.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <a href="#sample" className="bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-wide px-6 py-3 rounded-md transition-all uppercase">
                Read 5 chapters free
              </a>
              {HANDBOOK.amazonPaperback && (
                <a href={HANDBOOK.amazonPaperback} target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm tracking-wide px-6 py-3 rounded-md transition-all uppercase">
                  Paperback on Amazon
                </a>
              )}
              {HANDBOOK.amazonKindle && (
                <a href={HANDBOOK.amazonKindle} target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm tracking-wide px-6 py-3 rounded-md transition-all uppercase">
                  Kindle edition
                </a>
              )}
            </div>
            {!onAmazon && <p className="text-white/40 text-xs mt-4">Paperback and Kindle editions are on their way to Amazon. The free sample is ready now.</p>}
          </div>
        </div>
      </section>

      {/* Moments */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-3 text-center" style={{ fontFamily: "var(--font-serif)" }}>
            Written for the moments, not the theory
          </h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-10">
            Most trading psychology books explain why you feel what you feel. This one is for the ten minutes after it happens. Open it to the chapter that matches the moment.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {MOMENTS.map((m) => (
              <div key={m} className="bg-gray-50 border border-gray-100 rounded-lg p-5">
                <p className="font-bold text-navy leading-snug">{m}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm text-center mt-6">and {HANDBOOK.chapters - MOMENTS.length} more, across the session, the trade, the challenge, the people around you, and the long road.</p>
        </div>
      </section>

      {/* Sample capture */}
      <section id="sample" className="bg-navy py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-serif)" }}>
            Read five chapters free
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            The first five readings as a PDF, sent to your inbox. You also get the ICT Funded-Trader Playbook, the setups used on the live stream.
          </p>
          <div className="max-w-md mx-auto">
            <EmailSignup variant="inline" buttonLabel="Send Me the Sample" redirectTo="/handbook/sample" />
          </div>
          <p className="text-white/40 text-xs mt-4">
            Already trading live with us? The stream schedule is at{" "}
            <Link href="/live" className="text-gold hover:underline">r2ftrading.com/live</Link>.
          </p>
        </div>
      </section>

      {/* Author */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-navy mb-3" style={{ fontFamily: "var(--font-serif)" }}>About the author</h2>
          <p className="text-gray-600 leading-relaxed">
            Harvest Wright has traded for over ten years and coaches traders one to one through R2F Trading. He trades NQ live every weekday at the London open, entries and stops out loud, which is where most of these chapters were written.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
