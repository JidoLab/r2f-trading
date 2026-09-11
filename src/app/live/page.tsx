import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EmailSignup from "@/components/EmailSignup";
import PageTracker from "@/components/PageTracker";
import LiveSchedule from "@/components/LiveSchedule";
import Script from "next/script";
import Link from "next/link";
import type { Metadata } from "next";
import { seoTitle, seoDescription } from "@/lib/seo";

const CHANNEL_ID = "UCOJcTd6NQnnaaM5r2dFd-Yg";
const SUBSCRIBE_URL = "https://www.youtube.com/@R2F-Trading?sub_confirmation=1";

export const metadata: Metadata = {
  title: seoTitle("Live NQ Trading, London Session"),
  description: seoDescription(
    "Watch Harvest Wright trade NQ futures live every weekday at the 8 AM London open using ICT concepts. Real entries, real stops, questions answered in chat."
  ),
  keywords: [
    "live trading",
    "nq live trading",
    "ict live trading",
    "london session live",
    "nasdaq futures live stream",
    "day trading live stream",
  ],
  alternates: { canonical: "/live" },
  openGraph: {
    title: "Live NQ Trading, London Session | R2F Trading",
    description:
      "Every weekday at the 8 AM London open. Real entries, real stops, ICT concepts explained as the chart moves.",
    url: "https://www.r2ftrading.com/live",
  },
};

const SCHEDULE = [
  { city: "London", time: "8:00 AM" },
  { city: "Berlin / Paris", time: "9:00 AM" },
  { city: "Bangkok", time: "2:00 PM" },
  { city: "Singapore / Manila", time: "3:00 PM" },
  { city: "Sydney", time: "5:00 PM" },
  { city: "New York", time: "3:00 AM" },
];

const WHAT_HAPPENS = [
  {
    title: "Bias first",
    desc: "The higher timeframe read before the open: which side is likely to get the run, and the levels that decide it.",
  },
  {
    title: "Liquidity map",
    desc: "Equal highs, equal lows, old session levels. Where the stops are resting and which pool price is most likely to reach for.",
  },
  {
    title: "Entries out loud",
    desc: "When a setup forms, the reasoning is spoken before the click. The ones that get skipped are explained too.",
  },
  {
    title: "Risk on every trade",
    desc: "Stop placement, position size, and the point where the idea is wrong. Losses stay on the chart. No editing.",
  },
];

const FAQS = [
  {
    q: "When is the live stream?",
    a: "Every weekday at the 8:00 AM London open. That is 2:00 PM in Bangkok, 9:00 AM in Berlin and 3:00 AM in New York. The stream runs through the London morning, usually two to three hours.",
  },
  {
    q: "What do you trade on the stream?",
    a: "NQ, the Nasdaq 100 futures contract, using ICT concepts: liquidity, market structure, order blocks and fair value gaps. No indicators.",
  },
  {
    q: "Can I ask questions during the stream?",
    a: "Yes. Chat is open and questions get answered between setups. Keep it about the chart and the method.",
  },
  {
    q: "Is this financial advice?",
    a: "No. The stream is education and live commentary on the market. Every trade shown is a real decision with real risk, and nothing said is a recommendation to buy or sell anything.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@type": "BroadcastEvent",
      name: "Live NQ Trading, London Session",
      description:
        "Live NQ futures trading at the 8 AM London open using ICT concepts, every weekday.",
      isLiveBroadcast: true,
      url: "https://www.r2ftrading.com/live",
      publishedOn: {
        "@type": "BroadcastService",
        name: "R2F Trading on YouTube",
        url: "https://www.youtube.com/@R2F-Trading",
      },
      performer: { "@type": "Person", name: "Harvest Wright" },
    },
  ],
};

export default function LivePage() {
  return (
    <main>
      <Script
        id="json-ld-live"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <PageTracker event="live_page_view" />

      {/* Hero */}
      <section className="bg-navy py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-2 bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-white" />
            Live every weekday
          </span>
          <h1
            className="text-3xl md:text-5xl font-black text-white mb-5 leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            NQ Trading Live at the <span className="text-gold">London Open</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-6">
            Real entries, real stops, ICT concepts explained while the chart moves. Ask anything in chat.
          </p>
          <LiveSchedule />
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <a
              href={SUBSCRIBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-wide px-6 py-3 rounded-md transition-all uppercase"
            >
              Subscribe and hit the bell
            </a>
            <a
              href="https://t.me/Road2Funded"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm tracking-wide px-6 py-3 rounded-md transition-all uppercase"
            >
              Get the link on Telegram
            </a>
          </div>
        </div>
      </section>

      {/* Player */}
      <section className="bg-navy-light py-10 md:py-14">
        <div className="max-w-5xl mx-auto px-6">
          <div className="aspect-video rounded-lg overflow-hidden shadow-2xl bg-black">
            <iframe
              src={`https://www.youtube.com/embed/live_stream?channel=${CHANNEL_ID}`}
              title="R2F Trading live stream"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <p className="text-white/50 text-xs text-center mt-4">
            Offline right now? The player shows the next scheduled stream, and the last replay is on the{" "}
            <a
              href="https://www.youtube.com/@R2F-Trading/streams"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              channel&rsquo;s live tab
            </a>
            .
          </p>
        </div>
      </section>

      {/* Schedule */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl font-bold text-navy mb-3 text-center"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Stream Schedule
          </h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-10">
            Monday to Friday, starting at the 8:00 AM London open and running through the London morning. Times below shift by an hour when UK clocks change on 25 October.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SCHEDULE.map((s) => (
              <div key={s.city} className="bg-gray-50 border border-gray-100 rounded-lg p-5 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{s.city}</p>
                <p className="text-2xl font-black text-navy" style={{ fontFamily: "var(--font-heading)" }}>
                  {s.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What happens */}
      <section className="py-16 md:py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl font-bold text-navy mb-10 text-center"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            What Happens on Stream
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {WHAT_HAPPENS.map((w, i) => (
              <div key={w.title} className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
                <p className="text-gold font-black text-sm mb-2">0{i + 1}</p>
                <h3 className="text-xl font-bold text-navy mb-2">{w.title}</h3>
                <p className="text-gray-600 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Playbook capture */}
      <section className="bg-navy py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Get the Playbook Behind the Trades
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            The three setups used on stream, the pre-trade checklist and the risk rules that pass funded challenges. Free, sent to your inbox right away.
          </p>
          <div className="max-w-md mx-auto">
            <EmailSignup variant="inline" buttonLabel="Send Me the Playbook" />
          </div>
          <p className="text-white/40 text-xs mt-4">
            Want it explained one to one?{" "}
            <Link href="/coaching" className="text-gold hover:underline">
              See coaching options
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className="text-3xl font-bold text-navy mb-8 text-center"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Questions
          </h2>
          <div className="space-y-6">
            {FAQS.map((f) => (
              <div key={f.q} className="border-b border-gray-100 pb-6">
                <h3 className="font-bold text-navy text-lg mb-2">{f.q}</h3>
                <p className="text-gray-600 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-xs mt-10 leading-relaxed">
            Risk disclosure: futures and forex trading carry substantial risk and are not suitable for every investor. You can lose more than your initial deposit. Nothing on the stream or this page is financial advice. Past performance does not indicate future results.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
