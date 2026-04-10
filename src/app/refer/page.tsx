"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trackEvent } from "@/lib/tracking";

const BENEFITS = [
  {
    icon: "📖",
    title: "Advanced ICT Playbook PDF",
    desc: "Deep dives into institutional order flow, optimal trade entries, and advanced kill zone strategies.",
  },
  {
    icon: "📊",
    title: "ICT Trading Checklist",
    desc: "The exact pre-trade, in-trade, and post-trade checklist used by funded R2F students.",
  },
  {
    icon: "📧",
    title: "Exclusive Email Insights",
    desc: "Weekly tips on ICT concepts, trading psychology, and prop firm strategies from Harvest Wright.",
  },
];

const TESTIMONIALS = [
  { quote: "R2F's coaching helped me pass my FTMO challenge in under 60 days.", name: "A.S." },
  { quote: "Finally someone who explains ICT without making it overly complicated.", name: "H.C." },
  { quote: "The best coaching investment I've made. Completely changed my trading.", name: "T.W." },
];

export default function ReferralPage() {
  return (
    <Suspense fallback={<main><Header /><section className="bg-navy py-32 text-center"><p className="text-white/50">Loading...</p></section><Footer /></main>}>
      <ReferralContent />
    </Suspense>
  );
}

function ReferralContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get("ref") || "";

  const [referrerName, setReferrerName] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ref) {
      setLoaded(true);
      return;
    }
    fetch(`/api/referral?code=${encodeURIComponent(ref)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) setReferrerName(data.name);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [ref]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, ref }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("r2f_subscriber_email", email);
        localStorage.setItem("r2f_referral_code", data.referralCode || "");
        trackEvent("referral_signup", { ref });
        setStatus("success");
        router.push(`/thank-you/referral?code=${data.referralCode || ""}`);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (!loaded) {
    return (
      <main>
        <Header />
        <section className="bg-navy py-32 text-center">
          <p className="text-white/50">Loading...</p>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Header />

      {/* Hero */}
      <section className="bg-navy py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-block bg-gold/20 text-gold text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-6">
            Referral Invitation
          </span>
          <h1
            className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {referrerName ? (
              <>
                Your Friend <span className="text-gold">{referrerName}</span> Thinks You&apos;d Love R2F Trading
              </>
            ) : (
              <>
                You&apos;ve Been Invited to <span className="text-gold">R2F Trading</span>
              </>
            )}
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-4">
            Sign up now and you <strong className="text-white">both</strong> get our exclusive{" "}
            <span className="text-gold font-semibold">Advanced ICT Playbook PDF</span> — free.
          </p>
          <p className="text-white/40 text-sm mb-8">
            A comprehensive guide to institutional order flow, advanced entries, and kill zone mastery.
          </p>

          {/* Signup Form */}
          <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-xl p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your first name"
                className="w-full px-4 py-3 rounded-md border border-white/20 bg-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-gold"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="w-full px-4 py-3 rounded-md border border-white/20 bg-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-gold"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-gold hover:bg-gold-light text-navy font-bold py-3.5 rounded-md transition-all uppercase text-sm tracking-wide disabled:opacity-50"
              >
                {status === "loading" ? "Joining..." : "Claim Your Free Playbook"}
              </button>
              {status === "error" && (
                <p className="text-red-400 text-xs text-center">Something went wrong. Please try again.</p>
              )}
            </form>
            <p className="text-white/30 text-xs mt-3">
              100% free. No credit card. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Bonus Bar */}
      <section className="bg-gold py-4">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-8 text-center">
          {[
            { value: "50+", label: "Traders Coached" },
            { value: "85%", label: "Funding Rate" },
            { value: "10+", label: "Years Experience" },
            { value: "Free", label: "Bonus PDF" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-navy text-xl font-black">{s.value}</p>
              <p className="text-navy/70 text-[10px] font-semibold uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What You Get */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl font-bold text-navy text-center mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            What You&apos;ll Get
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            Join R2F Trading through this referral link and unlock exclusive bonuses — on top of our regular free resources.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BENEFITS.map((item) => (
              <div key={item.title} className="text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-navy font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About the Playbook */}
      <section className="py-16 md:py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-2xl font-bold text-navy text-center mb-10"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Inside the Advanced ICT Playbook
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Institutional order flow analysis framework",
              "Advanced order block identification techniques",
              "Kill zone timing strategies for London & NY sessions",
              "Fair value gap entries with precision confluences",
              "Liquidity sweep patterns used by smart money",
              "Risk management rules for prop firm challenges",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 py-3">
                <span className="text-gold text-lg mt-0.5">&#10003;</span>
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
            What Traders Are Saying
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-gold text-sm">&#9733;</span>
                  ))}
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
            Meet Harvest Wright
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            10+ years of ICT trading experience. TradingView Editors&apos; Pick winner. Top 1% in international trading competitions. FTMO Challenge passer. Harvest has coached 50+ traders through personalized 1-on-1 mentorship, with an 85% funded account success rate.
          </p>
          <div className="flex justify-center gap-6 text-center">
            {[
              { icon: "&#127942;", label: "Editors' Pick" },
              { icon: "&#128200;", label: "Top 1%" },
              { icon: "&#9989;", label: "FTMO Passer" },
            ].map((a) => (
              <div key={a.label}>
                <p className="text-2xl mb-1" dangerouslySetInnerHTML={{ __html: a.icon }} />
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
            Sign up now to get your free ICT Trading Checklist + the exclusive Advanced ICT Playbook.
          </p>
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 px-4 py-3 rounded-md border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-gold"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="bg-gold hover:bg-gold-light text-navy font-bold px-6 py-3 rounded-md transition-all uppercase text-sm tracking-wide whitespace-nowrap disabled:opacity-50"
              >
                {status === "loading" ? "Joining..." : "Get Free Playbook"}
              </button>
            </form>
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
