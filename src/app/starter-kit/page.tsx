import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTracker from "@/components/PageTracker";
import StarterKitCTA from "./StarterKitCTA";
import Script from "next/script";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ICT Trading Starter Kit — $49 One-Time",
  description:
    "Master ICT trading fundamentals with 5 self-paced modules covering order blocks, FVGs, killzones, risk management, and the funded account roadmap. Instant access for $49.",
  alternates: { canonical: "/starter-kit" },
  openGraph: {
    title: "ICT Trading Starter Kit — R2F Trading",
    description:
      "5 modules. Real ICT strategies. One payment. Learn order blocks, market structure, killzones, risk management, and how to get funded.",
    url: "/starter-kit",
  },
};

const MODULES = [
  {
    num: 1,
    title: "ICT Foundations",
    desc: "Understand the building blocks of ICT trading — order blocks, fair value gaps (FVGs), liquidity pools, and how institutional traders position themselves before retail ever sees the move.",
    lessons: 4,
  },
  {
    num: 2,
    title: "Market Structure",
    desc: "Learn to read the story price is telling through break of structure (BOS), change of character (CHOCH), displacement, and how to identify trend shifts before they happen.",
    lessons: 4,
  },
  {
    num: 3,
    title: "Killzone Trading",
    desc: "Master session-based trading with ICT killzones. Know exactly when to trade, when to sit out, and how to find optimal entries during the London and New York sessions.",
    lessons: 3,
  },
  {
    num: 4,
    title: "Risk Management Blueprint",
    desc: "The missing piece for most traders. Build a bulletproof risk framework with position sizing rules, drawdown limits, and the exact risk parameters used by funded traders.",
    lessons: 3,
  },
  {
    num: 5,
    title: "The Funded Account Roadmap",
    desc: "Step-by-step strategy for passing prop firm challenges. Covers firm selection, challenge math, trading plans, and the psychological edge you need to get funded on the first attempt.",
    lessons: 4,
  },
];

const WHAT_YOU_GET = [
  { icon: "📚", text: "5 in-depth modules with 18 lessons" },
  { icon: "📋", text: "Downloadable ICT Trading Checklist (PDF)" },
  { icon: "💬", text: "Access to private Telegram community" },
  { icon: "📧", text: "30-day email support from Harvest" },
  { icon: "♾️", text: "Lifetime access — learn at your own pace" },
];

const TESTIMONIALS = [
  {
    quote:
      "This free class alone was worth more than the $500 course I bought before.",
    name: "T.W.",
  },
  {
    quote:
      "I got funded 47 days after applying what I learned in the class.",
    name: "A.S.",
  },
  {
    quote:
      "Finally someone who explains ICT without making it overly complicated.",
    name: "H.C.",
  },
];

const FAQ = [
  {
    q: "Is this for beginners?",
    a: "Absolutely. The Starter Kit is designed for traders who are new to ICT concepts or have been struggling to make them work. We start from the foundations and build up.",
  },
  {
    q: "How long does it take to complete?",
    a: "Most students finish all 5 modules in 1-2 weeks going at their own pace. You have lifetime access, so there is no rush.",
  },
  {
    q: "Is this a subscription?",
    a: "No. It is a one-time payment of $49. You get lifetime access to all modules, the checklist, and the Telegram community.",
  },
  {
    q: "What if I want more hands-on coaching after?",
    a: "The Starter Kit is the perfect foundation. When you are ready for personalized 1-on-1 mentorship, check out our coaching plans starting at $150/week.",
  },
  {
    q: "Do you offer refunds?",
    a: "Because this is a digital product with immediate access, we do not offer refunds. However, if you put in the work and do not find value, reach out and we will make it right.",
  },
  {
    q: "How do I access the course after purchase?",
    a: "After your PayPal payment completes, you will be redirected to the course access page instantly. You will also receive an email with your access link.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "ICT Trading Starter Kit",
  description:
    "5-module self-paced course covering ICT foundations, market structure, killzone trading, risk management, and the funded account roadmap.",
  provider: {
    "@type": "Organization",
    name: "R2F Trading",
    url: "https://r2ftrading.com",
  },
  instructor: {
    "@type": "Person",
    name: "Harvest Wright",
  },
  courseMode: "online",
  isAccessibleForFree: false,
  offers: {
    "@type": "Offer",
    price: "49",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: "https://r2ftrading.com/starter-kit",
  },
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "online",
    courseWorkload: "PT10H",
  },
};

export default function StarterKitPage() {
  return (
    <main>
      <Script
        id="json-ld-starter-kit"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <PageTracker event="starter_kit_page_view" />

      {/* Hero */}
      <section className="bg-navy py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-block bg-gold/20 text-gold text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-6">
            Self-Paced Course
          </span>
          <h1
            className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            The ICT Trading <span className="text-gold">Starter Kit</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
            Everything you need to understand ICT trading, manage risk like a
            professional, and pass your first prop firm challenge — in 5
            structured modules.
          </p>
          <div className="flex flex-col items-center gap-2">
            <a
              href="#pricing"
              className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-wide px-8 py-4 rounded-md transition-all uppercase"
            >
              Get Instant Access — $49
            </a>
            <p className="text-white/30 text-xs">
              One-time payment. Lifetime access. No subscription.
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="bg-gold py-4">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-8 text-center">
          {[
            { value: "5", label: "Modules" },
            { value: "18", label: "Lessons" },
            { value: "50+", label: "Students Coached" },
            { value: "$49", label: "One-Time" },
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

      {/* What's Inside */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl font-bold text-navy text-center mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            What&apos;s Inside
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            5 modules built from real coaching sessions. No fluff, no filler —
            just the ICT concepts that actually move the needle.
          </p>
          <div className="space-y-6">
            {MODULES.map((m) => (
              <div
                key={m.num}
                className="flex gap-5 bg-cream rounded-lg p-6 border border-gold/20"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-navy rounded-full flex items-center justify-center">
                  <span
                    className="text-gold font-black text-lg"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {m.num}
                  </span>
                </div>
                <div>
                  <h3 className="text-navy font-bold text-lg mb-1">
                    {m.title}
                  </h3>
                  <p className="text-gray-500 text-sm mb-2">{m.desc}</p>
                  <p className="text-gold text-xs font-semibold">
                    {m.lessons} lessons
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-16 md:py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-bold text-navy text-center mb-10"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            What You Get
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WHAT_YOU_GET.map((item) => (
              <div key={item.text} className="flex items-start gap-3 py-3">
                <span className="text-2xl">{item.icon}</span>
                <p className="text-navy/80 text-sm font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 md:py-24 bg-white">
        <div className="max-w-lg mx-auto px-6">
          <div className="bg-navy rounded-lg p-8 text-center ring-2 ring-gold shadow-xl">
            <h2
              className="text-2xl font-bold text-white mb-2"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              ICT Trading Starter Kit
            </h2>
            <p className="text-white/50 text-sm mb-6">
              Full course access. One payment. Yours forever.
            </p>
            <div className="mb-6">
              <span className="text-white/40 line-through text-lg mr-2">
                $149
              </span>
              <span
                className="text-gold text-5xl font-black"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                $49
              </span>
              <span className="text-white/50 text-sm ml-2">one-time</span>
            </div>
            <ul className="text-left space-y-2 mb-8">
              {[
                "5 modules, 18 lessons",
                "ICT Trading Checklist (PDF)",
                "Private Telegram access",
                "30-day email support",
                "Lifetime access",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-white/80"
                >
                  <span className="text-gold mt-0.5 flex-shrink-0">
                    &#10003;
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <StarterKitCTA />
          </div>
          <p className="text-center text-gray-400 text-xs mt-4">
            Secure checkout via PayPal. Instant access after payment.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-20 bg-navy">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-2xl font-bold text-white text-center mb-10"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            What Students Are Saying
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-white/5 border border-white/10 rounded-lg p-6"
              >
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-gold text-sm">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-white/80 text-sm italic mb-3">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="text-white/40 text-xs font-bold">
                  &mdash; {t.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className="text-3xl font-bold text-navy text-center mb-10"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="border-b border-gray-100 pb-6 last:border-0"
              >
                <h3 className="text-navy font-bold text-sm mb-2">{item.q}</h3>
                <p className="text-gray-500 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-[#0a1628]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-2xl md:text-3xl font-black text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Start Your ICT Trading Journey Today
          </h2>
          <p className="text-white/50 text-sm mb-8">
            For less than a single losing trade, get the framework that has
            helped 50+ traders get funded.
          </p>
          <a
            href="#pricing"
            className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-wide px-8 py-4 rounded-md transition-all uppercase"
          >
            Get the Starter Kit — $49
          </a>
          <p className="text-white/30 text-xs mt-4">
            Already purchased?{" "}
            <Link href="/starter-kit/access" className="underline hover:text-white/50">
              Access your course here
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
