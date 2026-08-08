import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EmailSignup from "@/components/EmailSignup";
import PageTracker from "@/components/PageTracker";
import Script from "next/script";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free ICT Funded-Trader Playbook",
  description: "Get the free ICT Funded-Trader Playbook: the setups, the pre-trade checklist, the risk rules, and the mindset that pass funded challenges. Instant download.",
  alternates: { canonical: "/free-class" },
  openGraph: {
    title: "Free ICT Funded-Trader Playbook | R2F Trading",
    description: "The free ICT Funded-Trader Playbook by Harvest Wright: setups, checklist, risk rules, and the mindset funded traders use.",
    url: "/free-class",
  },
};

const WHAT_YOU_LEARN = [
  { icon: "📊", title: "The 3 ICT Setups That Actually Work", desc: "Cut through the noise. These are the only 3 setups you need to be consistently profitable." },
  { icon: "🎯", title: "How to Find High-Probability Entries", desc: "Stop guessing. Learn to read order blocks, fair value gaps, and liquidity sweeps like smart money." },
  { icon: "💰", title: "The Funded Account Blueprint", desc: "The exact step-by-step process our students use to pass prop firm challenges in under 60 days." },
  { icon: "🧠", title: "Trading Psychology Shortcuts", desc: "Why 90% of trading is mental — and the 3 mindset shifts that separate funded traders from everyone else." },
];

const TESTIMONIALS = [
  { quote: "This free playbook alone was worth more than the $500 course I bought before.", name: "T.W." },
  { quote: "Finally someone who explains ICT without making it overly complicated.", name: "H.C." },
  { quote: "I got funded 47 days after applying what I learned in the class.", name: "A.S." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "The ICT Funded-Trader Playbook",
  description:
    "The setups, the pre-trade checklist, the risk rules, and the mindset that helped 50+ traders get funded. A free playbook by Harvest Wright.",
  provider: {
    "@type": "Organization",
    name: "R2F Trading",
    url: "https://www.r2ftrading.com",
  },
  isAccessibleForFree: true,
  courseMode: "online",
  instructor: {
    "@type": "Person",
    name: "Harvest Wright",
  },
};

export default function FreeClassPage() {
  return (
    <main>
      <Script
        id="json-ld-free-class"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <PageTracker event="free_class_page_view" />

      {/* Hero */}
      <section className="bg-navy py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-block bg-gold/20 text-gold text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-6">
            Free ICT Playbook
          </span>
          <h1
            className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            The ICT Framework That Got <span className="text-gold">50+ Traders Funded</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
            Get the free ICT Funded-Trader Playbook: the exact setups, the pre-trade checklist, the risk rules, and the mindset my students use to pass funded challenges. Delivered instantly.
          </p>
          <div className="max-w-md mx-auto">
            <EmailSignup variant="inline" buttonLabel="Get the Free Playbook" />
          </div>
          <p className="text-white/30 text-xs mt-3">
            The free ICT Funded-Trader Playbook, delivered instantly. No cost, no card.
          </p>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="bg-gold py-4">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-8 text-center">
          {[
            { value: "50+", label: "Students Coached" },
            { value: "10+", label: "Years Experience" },
            { value: "85%", label: "Funding Rate" },
            { value: "Free", label: "No Card Required" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-navy text-xl font-black">{s.value}</p>
              <p className="text-navy/70 text-[10px] font-semibold uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What You'll Learn */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl font-bold text-navy text-center mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            What You&apos;ll Learn
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            This isn&apos;t another recycled ICT rehash. You&apos;ll walk away with setups and rules you can use on your next trade.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {WHAT_YOU_LEARN.map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="text-3xl flex-shrink-0">{item.icon}</div>
                <div>
                  <h3 className="text-navy font-bold text-lg mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Is This For */}
      <section className="py-16 md:py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl font-bold text-navy text-center mb-10"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            This Class Is For You If...
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "You've been trading for a while but can't seem to get consistent",
              "You're overwhelmed by ICT content and don't know where to start",
              "You've failed prop firm challenges and want a proven approach",
              "You're profitable sometimes but blow accounts during drawdowns",
              "You want to understand how institutions actually move price",
              "You're tired of indicator-based strategies that don't work",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 py-3">
                <span className="text-gold text-lg mt-0.5">✓</span>
                <p className="text-navy/80 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-20 bg-navy">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-2xl font-bold text-white text-center mb-10"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            What Traders Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-gold text-sm">★</span>)}
                </div>
                <p className="text-white/80 text-sm italic mb-3">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-white/40 text-xs font-bold">&mdash; {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Harvest */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-2xl font-bold text-navy mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Your Instructor: Harvest Wright
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            10+ years of ICT trading experience. TradingView Editors&apos; Pick winner. Top 1% in international trading competitions. FTMO Challenge passer. Harvest has coached 50+ traders through personalized 1-on-1 mentorship, with an 85% funded account success rate.
          </p>
          <div className="flex justify-center gap-6 text-center">
            {[
              { icon: "🏆", label: "Editors' Pick" },
              { icon: "📈", label: "Top 1%" },
              { icon: "✅", label: "FTMO Passer" },
            ].map((a) => (
              <div key={a.label}>
                <p className="text-2xl mb-1">{a.icon}</p>
                <p className="text-navy/60 text-xs font-semibold">{a.label}</p>
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
            Ready to Trade Like Smart Money?
          </h2>
          <p className="text-white/50 text-sm mb-8">
            Get the free playbook now and put it to work before your next session.
          </p>
          <div className="max-w-md mx-auto">
            <EmailSignup variant="inline" buttonLabel="Get the Free Playbook" />
          </div>
          <p className="text-white/20 text-xs mt-4">
            100% free. No credit card. Unsubscribe anytime.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
