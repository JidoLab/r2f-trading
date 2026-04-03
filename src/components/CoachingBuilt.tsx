import Link from "next/link";

export default function CoachingBuilt() {
  return (
    <section className="py-16 md:py-24 bg-gray-section">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2
          className="text-3xl md:text-4xl font-bold text-navy mb-6 italic"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Coaching Built Around You
        </h2>
        <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto mb-4">
          Whether you need a structured program or personalized guidance, I&rsquo;m here to craft the perfect coaching experience for you.
        </p>
        <p className="text-navy font-bold text-lg md:text-xl mb-8">
          Mentorship starting from <span className="text-gold">$150 USD</span> per week
        </p>
        <Link
          href="/coaching"
          className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm md:text-base tracking-wide px-8 py-4 rounded-md transition-all hover:shadow-lg hover:shadow-gold/20 uppercase"
        >
          Explore Coaching Plans
        </Link>
      </div>
    </section>
  );
}
