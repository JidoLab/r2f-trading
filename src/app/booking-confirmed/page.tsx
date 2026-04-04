import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function BookingConfirmedPage() {
  return (
    <main>
      <Header />

      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="text-5xl mb-6">🎉</div>
          <h1
            className="text-3xl md:text-4xl font-bold text-navy mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            You&rsquo;re Booked!
          </h1>
          <p className="text-gray-600 leading-relaxed mb-8">
            I&rsquo;m looking forward to our discovery call. Check your email for the calendar invite and meeting details. In the meantime, here&rsquo;s what you can do to prepare:
          </p>

          <div className="bg-cream rounded-lg p-8 text-left mb-8">
            <h3 className="text-navy font-bold mb-4">Before Our Call:</h3>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-gold font-bold mt-0.5">1</span>
                <span>Think about your current trading experience level and main challenges</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold font-bold mt-0.5">2</span>
                <span>Have your trading goals ready — what does success look like for you?</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold font-bold mt-0.5">3</span>
                <span>Browse our <Link href="/trading-insights" className="text-gold font-semibold hover:text-gold-light">latest articles</Link> to get a feel for the ICT methodology</span>
              </li>
            </ul>
          </div>

          <div className="bg-navy rounded-lg p-8 text-center mb-8">
            <h3
              className="text-white font-bold text-xl mb-3"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Explore Our Coaching Plans
            </h3>
            <p className="text-white/60 text-sm mb-6">
              Mentorship starting from <span className="text-gold font-bold">$150 USD</span> per week
            </p>
            <Link
              href="/coaching"
              className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-wide px-8 py-3 rounded-md transition-all uppercase"
            >
              View Coaching Plans
            </Link>
          </div>

          <p className="text-gray-400 text-sm">
            Questions before our call? Message me on{" "}
            <a href="https://wa.me/66935754757" className="text-gold hover:text-gold-light">WhatsApp</a>{" "}
            or{" "}
            <a href="https://t.me/Road2Funded" className="text-gold hover:text-gold-light">Telegram</a>.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
