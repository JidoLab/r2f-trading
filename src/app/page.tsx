import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Banner from "@/components/Banner";
import MeetMentor from "@/components/MeetMentor";
import Methodology from "@/components/Methodology";
import Achievements from "@/components/Achievements";
import Testimonials from "@/components/Testimonials";
import YouTubePreview from "@/components/YouTubePreview";
import FinalCTA from "@/components/FinalCTA";
import LeadCaptureSection from "@/components/LeadCaptureSection";
import Footer from "@/components/Footer";
import Script from "next/script";

// Edge-cache the rendered HTML for 1 hour. The homepage is pure marketing
// content with no per-request personalization — caching it at Vercel's
// edge drops TTFB from ~600ms (full render per request) to ~50ms (cache
// hit). After 3600s the next visitor gets a stale-while-revalidate
// regen — no user ever waits for the rebuild. Deploys invalidate the
// cache automatically, so copy changes go live instantly.
export const revalidate = 3600;

// Organization schema — primary entity for AI source selection
const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "R2F Trading",
  // alternateName accepts an array — these are the EXACT brand strings
  // people search for. Without "R2F" here, GSC shows our own brand at
  // position 47 for the literal query "r2f". Listing them all fixes that.
  alternateName: ["R2F", "Road to Funded", "R2FTrading", "Road 2 Funded"],
  url: "https://www.r2ftrading.com",
  logo: "https://www.r2ftrading.com/favicon.png",
  description: "Professional ICT trading coaching and mentorship with Harvest Wright. Personalized 1-on-1 sessions for traders at all levels.",
  founder: {
    "@type": "Person",
    name: "Harvest Wright",
    jobTitle: "ICT Trading Coach",
    url: "https://www.r2ftrading.com/about",
    knowsAbout: [
      "ICT trading methodology",
      "Inner Circle Trader concepts",
      "Fair Value Gaps",
      "Order blocks",
      "Liquidity sweeps",
      "Smart money concepts",
      "Forex trading",
      "Prop firm challenges",
      "FTMO",
      "Trading psychology",
      "Risk management",
      "Price action trading",
    ],
  },
  knowsAbout: [
    "ICT trading methodology",
    "Forex trading coaching",
    "Prop firm challenge preparation",
    "Trading psychology",
    "Risk management for traders",
    "Smart money concepts",
    "Price action analysis",
  ],
  areaServed: "Worldwide",
  sameAs: [
    "https://x.com/Road2Funded",
    "https://www.youtube.com/@R2FTrading",
    "https://t.me/Road2Funded",
    "https://www.tradingview.com/u/HarvestSignals/",
  ],
};

// WebSite schema — enables sitelinks search box in Google
const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "R2F Trading",
  url: "https://www.r2ftrading.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://www.r2ftrading.com/trading-insights?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

// ProfessionalService schema — for local/service visibility
const serviceLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "R2F Trading",
  url: "https://www.r2ftrading.com",
  serviceType: "Trading Coaching",
  priceRange: "$150-$1000",
  provider: { "@id": "https://www.r2ftrading.com/#organization" },
};

export default function Home() {
  return (
    <main>
      <Script
        id="json-ld-homepage"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationLd, websiteLd, serviceLd]) }}
      />
      <Header />
      <Hero />
      <Banner />
      <MeetMentor />
      <Methodology />
      <Achievements />
      <Testimonials />
      <YouTubePreview />
      <FinalCTA />
      <LeadCaptureSection />
      <Footer />
    </main>
  );
}
