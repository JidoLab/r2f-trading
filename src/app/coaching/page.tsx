import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTracker from "@/components/PageTracker";
import PayPalButton from "@/components/PayPalButton";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ICT Trading Coaching Plans",
  description: "1-on-1 ICT trading coaching with Harvest Wright. Lite ($150/wk), Pro ($200/wk), or Full Mentorship ($1,000/4mo). Get funded faster with personalized guidance.",
  alternates: { canonical: "/coaching" },
  openGraph: {
    title: "ICT Trading Coaching Plans — R2F Trading",
    description: "Personalized 1-on-1 ICT trading mentorship. Lite, Pro, and Full Mentorship plans available.",
    url: "/coaching",
  },
};

const plans = [
  {
    name: "Lite Coaching",
    price: "$150",
    period: "per week / $600 per month",
    paypalAmount: "600.00",
    paypalDesc: "Lite Coaching — 1 month (4 weekly sessions)",
    ideal: "Beginners or traders who want focused guidance with less frequent interaction.",
    features: [
      "1 Weekly Coaching Session (60-90 min)",
      "Access to basic trading templates and foundational materials",
      "Weekly action plans with progress reviews",
      "Direct access to private Telegram/WhatsApp for follow-up",
    ],
    highlight: false,
  },
  {
    name: "Pro Coaching",
    price: "$200",
    period: "per week / $800 per month",
    paypalAmount: "800.00",
    paypalDesc: "Pro Coaching — 1 month (8 weekly sessions)",
    ideal: "Traders who want regular and intensive coaching for faster progress.",
    features: [
      "2 Weekly Coaching Sessions (60-90 min each)",
      "Advanced trading templates and premium materials",
      "Live market walkthroughs in real time",
      "Weekly action plans with progress reviews",
      "Direct access to private Telegram/WhatsApp for follow-up",
      "Recorded sessions for review",
    ],
    highlight: true,
  },
  {
    name: "Full Mentorship",
    price: "$1,000",
    period: "for 4 months",
    paypalAmount: "1000.00",
    paypalDesc: "Full Mentorship — 4 months complete program",
    ideal: "Serious aspiring traders who want a comprehensive, long-term roadmap to success.",
    features: [
      "2 sessions per week for 4 months (60-90 min each)",
      "Full resource library including proprietary strategies",
      "Psychological coaching for mindset mastery",
      "Monthly in-depth trade performance reviews",
      "Direct access to private Telegram/WhatsApp for follow-up",
      "Custom trading plan development",
      "Recorded sessions for review",
      "Complimentary 10k FTMO Challenge at end of 3rd month",
    ],
    highlight: false,
  },
];

export default function CoachingPage() {
  return (
    <main>
      <Header />
      <PageTracker event="coaching_page_view" />

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h1
              className="text-4xl md:text-5xl font-bold text-navy mb-4"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Coaching Tailored for Your Trading Success
            </h1>
            <p className="text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Unlock your full trading potential with personalized coaching designed to meet you where you are and take you where you want to go. Whether you&rsquo;re just starting or refining advanced strategies, my mentorship combines proven ICT concepts with real-world insights.
            </p>
          </div>

          <h2
            className="text-2xl md:text-3xl font-bold text-navy text-center mb-10"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Choose the Right Path for You
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg p-8 flex flex-col ${
                  plan.highlight
                    ? "bg-navy text-white ring-2 ring-gold shadow-xl scale-[1.02]"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                {plan.highlight && (
                  <div className="text-gold text-xs font-bold uppercase tracking-wider mb-2">
                    Most Popular
                  </div>
                )}
                <h3
                  className={`text-2xl font-bold mb-1 ${plan.highlight ? "text-white" : "text-navy"}`}
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span
                    className={`text-3xl font-black ${plan.highlight ? "text-gold" : "text-gold"}`}
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {plan.price}
                  </span>
                  <span className={`text-sm ml-2 ${plan.highlight ? "text-white/60" : "text-gray-500"}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlight ? "text-white/70" : "text-gray-500"}`}>
                  <span className="font-semibold">Ideal for:</span> {plan.ideal}
                </p>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-start gap-2 text-sm ${
                        plan.highlight ? "text-white/80" : "text-gray-600"
                      }`}
                    >
                      <span className="text-gold mt-0.5 flex-shrink-0">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className={`block text-center font-bold text-sm tracking-wide px-6 py-3 rounded-md transition-all uppercase ${
                    plan.highlight
                      ? "bg-gold hover:bg-gold-light text-navy"
                      : "bg-navy hover:bg-navy-light text-white"
                  }`}
                >
                  Book Free Discovery Call
                </Link>
                <PayPalButton
                  planName={plan.name}
                  amount={plan.paypalAmount}
                  description={plan.paypalDesc}
                  highlight={plan.highlight}
                />
              </div>
            ))}
          </div>

          <div className="text-center bg-cream rounded-lg p-10">
            <h3
              className="text-2xl font-bold text-navy mb-3"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Looking for a Customized Approach?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Every trader&rsquo;s journey is unique, and so is your coaching experience. If you&rsquo;re seeking something more tailored to your goals and needs, let&rsquo;s create a custom plan together.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-wide px-8 py-4 rounded-md transition-all uppercase"
            >
              Book Your FREE Session
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
