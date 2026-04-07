import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EmailSignup from "@/components/EmailSignup";
import PageTracker from "@/components/PageTracker";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free ICT Trading Class | R2F Trading",
  description: "Join our free live trading class and learn the ICT concepts that helped students get funded in under 60 days. Limited spots available.",
  openGraph: {
    title: "Free ICT Trading Class — R2F Trading",
    description: "Learn the exact ICT framework used by funded traders. Free live class with Harvest Wright.",
    type: "website",
  },
};

const WHAT_YOU_LEARN = [
  { icon: "📊", title: "The 3 ICT Setups That Actually Work", desc: "Cut through the noise — these are the only 3 setups you need to be consistently profitable." },
  { icon: "🎯", title: "How to Find High-Probability Entries", desc: "Stop guessing. Learn to read order blocks, fair value gaps, and liquidity sweeps like smart money." },
  { icon: "💰", title: "The Funded Account Blueprint", desc: "The exact step-by-step process our students use to pass prop firm challenges in under 60 days." },
  { icon: "🧠", title: "Trading Psychology Shortcuts", desc: "Why 90% of trading is mental — and the 3 mindset shifts that separate funded traders from everyone else." },
];

const TESTIMONIALS = [
  { quote: "This free class alone was worth more than the $500 course I bought before.", name: "T.W." },
  { quote: "Finally someone who explains ICT without making it overly complicated.", name: "H.C." },
  { quote: "I got funded 47 days after applying what I learned in the class.", name: "A.S." },
];

export default function FreeClassPage() {
  return (
    <main>
      <Header />
      <PageTracker event="free_class_page_view" />

      {/* Hero */}
      <section className="bg-navy py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-block bg-gold/20 text-gold text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-6">
            Free Live Class
          </span>
          <h1
            className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            The ICT Framework That Got <span className="text-gold">50+ Traders Funded</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
            Join a free live class where I break down the exact ICT concepts, setups, and risk management rules that my students use to pass funded challenges — in plain English.
          </p>
          <div className="max-w-md mx-auto">
            <EmailSignup variant="inline" />
          </div>
          <p className="text-white/30 text-xs mt-3">
            Sign up to get the class link + free ICT Trading Checklist
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
            This isn&apos;t another generic webinar. You&apos;ll walk away with actionable strategies you can use immediately.
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
            What Past Attendees Say
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
            Sign up now to reserve your spot. You&apos;ll also get our free ICT Trading Checklist immediately.
          </p>
          <div className="max-w-md mx-auto">
            <EmailSignup variant="inline" />
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
