import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="py-16 md:py-24 bg-navy text-center">
      <div className="max-w-3xl mx-auto px-6">
        <h2
          className="text-3xl md:text-4xl font-bold text-white mb-4 italic"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Coaching Built Around You
        </h2>
        <p className="text-white/70 leading-relaxed mb-3 max-w-2xl mx-auto">
          Becoming a consistently profitable trader isn&rsquo;t just a dream&mdash;it&rsquo;s a process. Whether you need a structured program or personalized guidance, I&rsquo;m here to craft the perfect coaching experience for you.
        </p>
        <p className="text-white font-bold text-lg md:text-xl mb-8">
          Mentorship starting from <span className="text-gold">$150 USD</span> per week
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/coaching"
            className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm md:text-base tracking-wide px-8 py-4 rounded-md transition-all hover:shadow-lg hover:shadow-gold/20 uppercase"
          >
            Explore Coaching Plans
          </Link>
          <Link
            href="/contact"
            className="inline-block border-2 border-white/20 hover:border-gold text-white hover:text-gold font-bold text-sm md:text-base tracking-wide px-8 py-4 rounded-md transition-all uppercase"
          >
            Book a Free Discovery Call
          </Link>
        </div>
      </div>
    </section>
  );
}
