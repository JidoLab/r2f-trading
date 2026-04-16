import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CalendlyEmbed from "@/components/CalendlyEmbed";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're In! | R2F Trading",
  description: "Your free ICT Trading Checklist is on its way. Book a free discovery call while you wait.",
};

export default function ThankYouPage() {
  return (
    <main>
      <Header />

      {/* Hero */}
      <section className="bg-navy py-16 md:py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">✓</span>
          </div>
          <h1
            className="text-3xl md:text-4xl font-black text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            You&apos;re In! Check Your Email
          </h1>
          <p className="text-white/60 text-lg mb-2">
            Your free <span className="text-gold font-semibold">ICT Trading Checklist</span> is on its way to your inbox.
          </p>
          <p className="text-white/40 text-sm">
            While you wait, why not book a free discovery call?
          </p>
        </div>
      </section>

      {/* What to Expect */}
      <section className="bg-[#0a1628] py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-xl font-bold text-white text-center mb-8"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            What You&apos;ll Get Over The Next 2 Weeks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                day: "Day 2",
                title: "3 Beginner Mistakes",
                desc: "The costly errors every ICT trader makes — and how to avoid them.",
              },
              {
                day: "Day 5",
                title: "ICT Concepts Deep Dive",
                desc: "How smart money concepts changed everything for our students.",
              },
              {
                day: "Day 8",
                title: "Student Success Story",
                desc: "From breakeven to funded — a real transformation you can learn from.",
              },
            ].map((item) => (
              <div
                key={item.day}
                className="bg-white/5 border border-white/10 rounded-lg p-5 text-center"
              >
                <span className="text-gold text-xs font-bold uppercase tracking-wider">
                  {item.day}
                </span>
                <h3 className="text-white font-bold mt-2 mb-1">{item.title}</h3>
                <p className="text-white/50 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-navy py-10">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-white/50 text-sm mb-1">
            Join <span className="text-gold font-bold">50+ traders</span> already leveling up with R2F Trading
          </p>
          <div className="flex justify-center gap-1 mt-3">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-gold text-lg">★</span>
            ))}
          </div>
          <p className="text-white/30 text-xs mt-2">
            &quot;Best coaching investment I&apos;ve made. Funded in 47 days.&quot;
          </p>
        </div>
      </section>

      {/* Calendly Embed */}
      <section className="bg-[#0a1628] py-12">
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className="text-2xl font-bold text-white text-center mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Book Your Free Discovery Call
          </h2>
          <p className="text-white/50 text-center text-sm mb-4">
            15 minutes. No pressure. Let&apos;s talk about your trading goals and see if coaching is right for you.
          </p>
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-gold/10 text-gold text-xs font-bold px-4 py-2 rounded-full border border-gold/20">
              <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
              Limited spots available this month
            </span>
          </div>
          <CalendlyEmbed />
        </div>
      </section>

      <Footer />
    </main>
  );
}
