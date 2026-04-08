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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "R2F Trading",
  description: "Professional ICT trading coaching and mentorship with Harvest Wright. Personalized 1-on-1 sessions for traders at all levels.",
  url: "https://www.r2ftrading.com",
  logo: "https://www.r2ftrading.com/favicon.png",
  founder: {
    "@type": "Person",
    name: "Harvest Wright",
    jobTitle: "ICT Trading Coach",
  },
  areaServed: "Worldwide",
  serviceType: "Trading Coaching",
  priceRange: "$150-$1000",
  sameAs: [
    "https://x.com/Road2Funded",
    "https://www.youtube.com/@R2FTrading",
    "https://t.me/Road2Funded",
  ],
};

export default function Home() {
  return (
    <main>
      <Script
        id="json-ld-homepage"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
