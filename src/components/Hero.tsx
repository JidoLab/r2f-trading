import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative min-h-[520px] md:min-h-[600px] flex items-center overflow-hidden">
      <style>{`
        @keyframes cta-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
          50% { box-shadow: 0 0 20px 4px rgba(212, 175, 55, 0.4); }
        }
        .cta-pulse {
          animation: cta-pulse 3s ease-in-out infinite;
        }
        .cta-pulse:hover {
          animation: none;
        }
      `}</style>
      {/*
        Hero background — was a CSS background-image on a 3.29MB PNG, which
        gave us a 43.2s mobile LCP and dragged Google's mobile-first index
        away from the site entirely (May 2026 GSC audit). Next/Image with
        priority + sizes:
          - Auto-generates AVIF/WebP variants per device
          - Preload hint injected into <head> so browser fetches it ASAP
          - Mobile receives ~50-100KB instead of 3.29MB
        Empty alt is intentional — this is decorative; the H1 carries meaning.
      */}
      <Image
        src="/hero-bg.png"
        alt=""
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        quality={75}
        className="object-cover object-center"
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
          <div className="flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="cta-pulse inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm md:text-base tracking-wide px-8 py-4 rounded-md transition-all hover:shadow-lg hover:shadow-gold/20 uppercase"
            >
              Book A Free Discovery Session
            </Link>
            <Link
              href="/coaching"
              className="inline-block border-2 border-white/30 hover:border-gold text-white hover:text-gold font-bold text-sm md:text-base tracking-wide px-8 py-4 rounded-md transition-all uppercase"
            >
              Explore Coaching Plans
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
