import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Banner from "@/components/Banner";
import MeetMentor from "@/components/MeetMentor";
import Methodology from "@/components/Methodology";
import Achievements from "@/components/Achievements";
import Testimonials from "@/components/Testimonials";
import YouTubePreview from "@/components/YouTubePreview";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <Banner />
      <MeetMentor />
      <Methodology />
      <Achievements />
      <Testimonials />
      <YouTubePreview />
      <FinalCTA />
      <Footer />
    </main>
  );
}
