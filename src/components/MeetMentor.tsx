import Link from "next/link";
import Image from "next/image";

export default function MeetMentor() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start gap-10 md:gap-16">
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="w-44 h-44 md:w-52 md:h-52 rounded-full overflow-hidden border-4 border-gold/30 shadow-lg relative">
              {/* 400x400 source displayed at 176-208px — Next/Image
                  optimizes from ~200 KiB PNG to ~10-20 KiB AVIF. */}
              <Image
                src="/mentor.png"
                alt="Harvest - R2F Trading Mentor"
                fill
                sizes="(max-width: 768px) 176px, 208px"
                className="object-cover"
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
            {/* text-gold-dark on white: 5.0:1 contrast (passes WCAG AA).
                Was text-gold #c9a84c → 2.85:1 which failed. Hover still
                lightens to gold-light for visual feedback. */}
            <Link
              href="/about"
              className="inline-block text-gold-dark font-bold hover:text-gold transition-colors uppercase text-sm tracking-wide"
            >
              More About Me &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
