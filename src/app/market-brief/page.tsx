import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";
import MarketBriefPlayer from "./MarketBriefPlayer";

export const metadata: Metadata = {
  title: "Daily Market Brief",
  description:
    "Listen to Harvest's daily 2-minute market brief covering key levels, economic events, and actionable ICT trading setups. Updated every morning.",
  alternates: {
    canonical: "/market-brief",
    types: {
      "application/rss+xml": "/market-brief/feed.xml",
    },
  },
  openGraph: {
    title: "Daily Market Brief — R2F Trading",
    description:
      "Start your trading day with Harvest's 2-minute audio brief. Key levels, events, and ICT setups delivered daily.",
    url: "/market-brief",
  },
};

export default function MarketBriefPage() {
  return (
    <main>
      <Header />

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h1
            className="text-4xl md:text-5xl font-bold text-navy mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Daily Market Brief
          </h1>
          <p className="text-gray-600 leading-relaxed max-w-3xl mb-4">
            Start your trading day right. Every morning, Harvest delivers a
            2-minute audio brief covering key levels to watch, upcoming economic
            events, and one actionable ICT setup tip.
          </p>
          <p className="text-sm text-gray-400 mb-12">
            Subscribe via{" "}
            <a
              href="/market-brief/feed.xml"
              className="text-gold hover:underline"
            >
              RSS / Podcast Feed
            </a>{" "}
            to get briefs in your favorite podcast app.
          </p>

          <MarketBriefPlayer />
        </div>
      </section>

      <Footer />
    </main>
  );
}
