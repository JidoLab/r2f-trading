import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-[520px] md:min-h-[600px] flex items-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero-bg.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/85 via-navy/60 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28 w-full">
        <div className="max-w-2xl">
          <h1
            className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl text-white leading-[0.95] mb-4 uppercase tracking-wide"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Charting the Path to{" "}
            <span className="text-gold-light">Financial Freedom</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-bold mb-2">
            Professional ICT Coaching &amp; Mentorship
          </p>
          <p className="text-white/60 text-base md:text-lg italic mb-8">
            Propel your growth with personalized one-on-one training
          </p>
          <Link
            href="/contact"
            className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm md:text-base tracking-wide px-8 py-4 rounded-md transition-all hover:shadow-lg hover:shadow-gold/20 uppercase"
          >
            Book A Free Discovery Session
          </Link>
        </div>
      </div>
    </section>
  );
}
