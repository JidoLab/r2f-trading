import Link from "next/link";

export default function MeetMentor() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start gap-10 md:gap-16">
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="w-44 h-44 md:w-52 md:h-52 rounded-full overflow-hidden border-4 border-gold/30 shadow-lg">
              <img
                src="/mentor.png"
                alt="Harvest - R2F Trading Mentor"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex-1">
            <h2
              className="text-3xl md:text-4xl font-bold text-navy mb-6"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Meet Your Mentor
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              I&rsquo;m Harvest, the sole mentor behind R2F (Road 2 Funded). With 10+ years of experience in trading with ICT Concepts, and a passion for coaching traders, I&rsquo;ve developed my personal methodology that bridges the gap between confusion and clarity.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Whether you&rsquo;re new to trading or looking to refine your skills, I&rsquo;ll guide you every step of the way toward becoming a thriving, consistently profitable trader using the most effective techniques in the industry.
            </p>
            <Link
              href="/about"
              className="inline-block text-gold font-bold hover:text-gold-light transition-colors uppercase text-sm tracking-wide"
            >
              More About Me &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
