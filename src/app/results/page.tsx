import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CalendlyEmbed from "@/components/CalendlyEmbed";
import PageTracker from "@/components/PageTracker";
import Script from "next/script";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Results & Testimonials",
  description: "Real results from real traders. See how R2F Trading coaching has helped traders get funded, build consistency, and transform their trading careers.",
  alternates: { canonical: "/results" },
  openGraph: {
    title: "Student Results — R2F Trading",
    description: "See real trading results and testimonials from R2F Trading students.",
    url: "/results",
  },
};

const testimonials = [
  {
    quote: "Before working with R2F, I constantly second-guessed every decision I made. Now I can actually see consistent and gradual growth on my accounts! Harvest worked through all the aspects of my trading that was holding me back.",
    heading: "I finally feel confident in my trades",
    name: "T.W.",
    result: "Consistent growth",
  },
  {
    quote: "What stood out to me was how tailored the mentorship was. R2F didn't just give me generic strategies but truly focused on my strengths and weaknesses. The improvements I've seen in my trading psychology alone are incredible.",
    heading: "The personalized approach changed everything",
    name: "M.L.",
    result: "Improved psychology",
  },
  {
    quote: "I tried learning ICT on my own, but I was overwhelmed by the amount of content. Harvest broke down the concepts in an easy-to-follow way. I even got to learn his own personal methodologies that I've never seen anywhere else.",
    heading: "R2F gave me clarity on ICT Concepts",
    name: "H.C.",
    result: "ICT mastery",
  },
  {
    quote: "I got funded a couple of times but didn't know how to properly manage it and eventually lost the accounts. R2F's mentorship on scaling and risk management was a big lightbulb moment for me. I'm not only keeping my account but steadily growing it.",
    heading: "Turned my funded account into real growth",
    name: "A.S.",
    result: "Funded & growing",
  },
];

const achievements = [
  { image: "/achievements/tradingview-editors-pick.jpg", caption: "TradingView Editors' Pick", alt: "TradingView Editors' Pick Award" },
  { image: "/achievements/tradingview-competition.jpg", caption: "Top 1% in Trading Competition", alt: "TradingView Paper Trading Competition" },
  { image: "/achievements/ftmo-challenge.jpg", caption: "FTMO Challenge Passed", alt: "Passed FTMO Challenge Certificate" },
];

const stats = [
  { value: "10+", label: "Years Trading Experience" },
  { value: "50+", label: "Students Coached" },
  { value: "85%", label: "Student Funding Rate" },
  { value: "47", label: "Days to Funded (Fastest)" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "R2F Trading",
  url: "https://r2ftrading.com",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: String(testimonials.length),
    bestRating: "5",
    worstRating: "1",
  },
  review: testimonials.map((t) => ({
    "@type": "Review",
    author: {
      "@type": "Person",
      name: t.name,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    name: t.heading,
    reviewBody: t.quote,
  })),
};

export default function ResultsPage() {
  return (
    <main>
      <Script
        id="json-ld-results"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <PageTracker event="results_page_view" />

      {/* Hero */}
      <section className="bg-navy py-16 md:py-24 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h1
            className="text-3xl md:text-5xl font-black text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Real Results From <span className="text-gold">Real Traders</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Don&apos;t take our word for it. See what students have achieved with R2F Trading coaching.
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-gold py-8">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-navy text-3xl md:text-4xl font-black" style={{ fontFamily: "var(--font-heading)" }}>
                {s.value}
              </p>
              <p className="text-navy/70 text-xs font-semibold uppercase tracking-wide mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-cream">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl font-bold text-navy text-center mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Student Testimonials
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            Every student starts at a different place. What they share is the commitment to improve — and the results that follow.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-lg p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-gold/10 text-gold text-xs font-bold px-2.5 py-1 rounded-full">{t.result}</span>
                </div>
                <p className="text-gold font-bold text-lg mb-3" style={{ fontFamily: "var(--font-serif)" }}>
                  &ldquo;{t.heading}&rdquo;
                </p>
                <p className="text-gray-600 leading-relaxed mb-4 text-sm">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="text-navy font-bold text-sm">&mdash; {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements / Proof */}
      <section className="py-16 md:py-24 bg-navy">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl font-bold text-white text-center mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Proven Track Record
          </h2>
          <p className="text-white/60 text-center mb-12 max-w-2xl mx-auto">
            10+ years of trading, published analysis, competition wins, and funded accounts.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {achievements.map((item) => (
              <div key={item.alt} className="rounded-lg overflow-hidden bg-white/5 border border-white/10">
                <div className="aspect-square overflow-hidden">
                  <img src={item.image} alt={item.alt} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <p className="text-white/80 text-sm font-semibold text-center">{item.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The R2F Difference */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl font-bold text-navy text-center mb-12"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Why Students Choose R2F
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Personalized", desc: "No cookie-cutter strategies. Every session is tailored to your specific weaknesses and goals." },
              { title: "Accountability", desc: "Weekly reviews, trade journaling, and honest feedback keep you on track." },
              { title: "Results-Driven", desc: "The goal isn't just education — it's getting you funded and consistently profitable." },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <h3 className="text-navy font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + Calendly */}
      <section className="py-16 md:py-20 bg-[#0a1628]">
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className="text-2xl md:text-3xl font-bold text-white text-center mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Ready to Get Similar Results?
          </h2>
          <p className="text-white/50 text-center text-sm mb-8">
            Book a free 15-minute discovery call. No pressure — let&apos;s see if R2F coaching is right for you.
          </p>
          <CalendlyEmbed />
        </div>
      </section>

      <Footer />
    </main>
  );
}
