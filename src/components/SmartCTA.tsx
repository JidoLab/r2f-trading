"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CTAVariant = "discovery" | "coaching" | "checklist" | "crash-course" | "calculator" | "starter-kit";

interface CTAConfig {
  headline: string;
  subtext: string;
  buttonText: string;
  href: string;
  secondaryText?: string;
  secondaryHref?: string;
}

const CTA_VARIANTS: Record<CTAVariant, CTAConfig> = {
  discovery: {
    headline: "Ready to Take Your Trading Seriously?",
    subtext: "Book a free 15-minute strategy call. No pitch — just honest feedback on your trading.",
    buttonText: "Book Free Discovery Call",
    href: "/contact",
    secondaryText: "See coaching plans",
    secondaryHref: "/coaching",
  },
  coaching: {
    headline: "Only 3 Coaching Spots Left This Week",
    subtext: "Get personalized 1-on-1 ICT coaching with real-time trade feedback. Start seeing results in weeks, not months.",
    buttonText: "View Coaching Plans",
    href: "/coaching",
    secondaryText: "Book free call first",
    secondaryHref: "/contact",
  },
  checklist: {
    headline: "Free ICT Trading Checklist",
    subtext: "The exact checklist I use before every trade. Get it free — no spam, just value.",
    buttonText: "Get Free Checklist",
    href: "/free-class",
  },
  "crash-course": {
    headline: "Free 5-Day ICT Crash Course",
    subtext: "Concepts, setups, and live examples — delivered daily to your inbox. Start learning ICT the right way.",
    buttonText: "Start Free Course",
    href: "/crash-course",
  },
  calculator: {
    headline: "Know Your Risk Before Every Trade",
    subtext: "Use our free position size calculator to protect your funded account. Professional traders never skip this step.",
    buttonText: "Try the Calculator",
    href: "/tools/risk-calculator",
    secondaryText: "Get free checklist",
    secondaryHref: "/free-class",
  },
  "starter-kit": {
    headline: "ICT Trading Starter Kit — $49",
    subtext: "Templates, checklists, and the complete ICT framework in one package. Everything you need to start trading ICT.",
    buttonText: "Get the Starter Kit",
    href: "/starter-kit",
    secondaryText: "Or start with free class",
    secondaryHref: "/free-class",
  },
};

function chooseCTA(pathname: string): CTAVariant {
  // Coaching page visitors — they're warm, push for the call
  if (pathname === "/coaching" || pathname === "/starter-kit") return "discovery";

  // Contact page — they're already booking, show the starter kit
  if (pathname === "/contact") return "starter-kit";

  // Results/testimonials — social proof primed, go for coaching
  if (pathname === "/results") return "coaching";

  // Blog readers — offer value first
  if (pathname.startsWith("/trading-insights")) {
    // Check if returning visitor (multi-page)
    try {
      const visited = JSON.parse(localStorage.getItem("r2f_pages_visited") || "[]");
      if (visited.length >= 3) return "crash-course";
    } catch {}
    return "calculator";
  }

  // SEO landing pages — they searched for something, offer proof
  if (pathname.startsWith("/learn")) return "coaching";

  // Calculator users — already engaged, push to free class
  if (pathname.startsWith("/tools")) return "checklist";

  // Free class/crash course — they're learning, upsell coaching
  if (pathname === "/free-class" || pathname === "/crash-course") return "coaching";

  // Default homepage / about — start with the discovery call
  return "discovery";
}

export default function SmartCTA({ className = "" }: { className?: string }) {
  const [variant, setVariant] = useState<CTAVariant>("discovery");
  const [isSubscriber, setIsSubscriber] = useState(false);

  useEffect(() => {
    const pathname = window.location.pathname;

    // If already subscribed, skip lead capture CTAs
    if (localStorage.getItem("r2f_subscriber_email")) {
      setIsSubscriber(true);
      // Subscribers get coaching/discovery CTAs instead of lead magnets
      if (pathname.startsWith("/trading-insights") || pathname.startsWith("/learn")) {
        setVariant("coaching");
      } else {
        setVariant("discovery");
      }
      return;
    }

    setVariant(chooseCTA(pathname));
  }, []);

  const cta = CTA_VARIANTS[variant];

  // Don't show if subscriber is on a page where the CTA would be redundant
  if (isSubscriber && (variant === "checklist" || variant === "crash-course")) {
    const fallback = CTA_VARIANTS.coaching;
    return (
      <div className={`bg-white/5 border border-white/10 rounded-xl p-6 ${className}`}>
        <h3 className="text-white font-bold text-lg mb-2" style={{ fontFamily: "var(--font-serif)" }}>
          {fallback.headline}
        </h3>
        <p className="text-white/50 text-sm mb-4">{fallback.subtext}</p>
        <Link
          href={fallback.href}
          className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-3 rounded-md transition-all uppercase"
        >
          {fallback.buttonText}
        </Link>
      </div>
    );
  }

  return (
    <div className={`bg-white/5 border border-white/10 rounded-xl p-6 ${className}`}>
      <h3 className="text-white font-bold text-lg mb-2" style={{ fontFamily: "var(--font-serif)" }}>
        {cta.headline}
      </h3>
      <p className="text-white/50 text-sm mb-4">{cta.subtext}</p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={cta.href}
          className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-3 rounded-md transition-all uppercase"
        >
          {cta.buttonText}
        </Link>
        {cta.secondaryText && cta.secondaryHref && (
          <Link
            href={cta.secondaryHref}
            className="inline-block border border-white/20 hover:border-gold text-white/70 hover:text-gold font-bold text-sm px-6 py-3 rounded-md transition-all uppercase"
          >
            {cta.secondaryText}
          </Link>
        )}
      </div>
    </div>
  );
}
