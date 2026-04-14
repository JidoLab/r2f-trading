"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import EmailSignup from "@/components/EmailSignup";

type OfferType = "checklist" | "crash-course" | "book-call";

interface OfferConfig {
  emoji: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaAction: "email" | "link";
  ctaLink?: string;
}

const OFFERS: Record<OfferType, OfferConfig> = {
  checklist: {
    emoji: "\uD83D\uDCCA",
    headline: "Wait! Don\u2019t Leave Empty-Handed",
    subheadline:
      "Get the free ICT Trading Checklist \u2014 the exact checklist I use before every trade.",
    ctaText: "Get Free Checklist",
    ctaAction: "email",
  },
  "crash-course": {
    emoji: "\uD83D\uDE80",
    headline: "You\u2019re Clearly Serious About Trading",
    subheadline:
      "Join the free 5-day ICT crash course. Concepts, setups, and live examples \u2014 delivered daily to your inbox.",
    ctaText: "Start the Free Crash Course",
    ctaAction: "email",
  },
  "book-call": {
    emoji: "\uD83D\uDD25",
    headline: "Only 3 Coaching Spots Left This Week",
    subheadline:
      "Book a free 15-minute strategy call. No pitch \u2014 just honest feedback on your trading.",
    ctaText: "Book My Free Call",
    ctaAction: "link",
    ctaLink: "/contact",
  },
};

function getOfferType(): OfferType | null {
  // Already subscribed — don't show anything
  if (localStorage.getItem("r2f_subscriber_email")) return null;

  const path = window.location.pathname;

  // On coaching or starter-kit pages — push for a call
  if (path === "/coaching" || path === "/starter-kit") return "book-call";

  // Returning visitor (3+ pages) — upgrade to crash course
  try {
    const visited = JSON.parse(
      localStorage.getItem("r2f_pages_visited") || "[]"
    );
    if (Array.isArray(visited) && visited.length >= 3) return "crash-course";
  } catch {
    // ignore parse errors
  }

  // First visit — default checklist offer
  return "checklist";
}

function trackPageVisit() {
  try {
    const raw = localStorage.getItem("r2f_pages_visited");
    const visited: string[] = raw ? JSON.parse(raw) : [];
    const path = window.location.pathname;
    if (!visited.includes(path)) {
      visited.push(path);
      localStorage.setItem("r2f_pages_visited", JSON.stringify(visited));
    }
  } catch {
    // ignore
  }
}

export default function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [offerType, setOfferType] = useState<OfferType | null>(null);

  const trigger = useCallback(() => {
    if (sessionStorage.getItem("r2f_exit_shown")) return;
    const type = getOfferType();
    if (!type) return; // subscribed — skip
    sessionStorage.setItem("r2f_exit_shown", "1");
    setOfferType(type);
    setShow(true);
  }, []);

  useEffect(() => {
    // Track this page visit for the multi-page logic
    trackPageVisit();

    // Don't show on admin pages
    if (window.location.pathname.startsWith("/admin")) return;

    if (sessionStorage.getItem("r2f_exit_shown")) return;

    // Desktop: mouse leaves viewport toward top (tab bar)
    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY <= 5) trigger();
    }

    // Mobile: rapid scroll up (user trying to leave)
    let lastScrollY = window.scrollY;
    let rapidScrollCount = 0;
    function handleScroll() {
      const diff = lastScrollY - window.scrollY;
      if (diff > 50) {
        rapidScrollCount++;
        if (rapidScrollCount >= 3 && window.scrollY < 200) trigger();
      } else {
        rapidScrollCount = 0;
      }
      lastScrollY = window.scrollY;
    }

    // Wait 20 seconds before enabling — let visitors engage with content first
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
      window.addEventListener("scroll", handleScroll, { passive: true });
    }, 20000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [trigger]);

  useEffect(() => {
    if (!show) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setShow(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [show]);

  const offer = useMemo(
    () => (offerType ? OFFERS[offerType] : null),
    [offerType]
  );

  if (!show || !offer) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => setShow(false)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold accent bar */}
        <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />

        <div className="bg-navy p-8">
          <button
            onClick={() => setShow(false)}
            className="absolute top-5 right-5 text-gray-400 hover:text-white text-2xl leading-none transition-colors"
            aria-label="Close"
          >
            &times;
          </button>

          <div className="text-center mb-6">
            <p className="text-4xl mb-4">{offer.emoji}</p>
            <h2
              className="text-2xl font-bold text-white mb-2"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {offer.headline}
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              {offer.subheadline}
            </p>
          </div>

          {offer.ctaAction === "email" ? (
            <EmailSignup variant="popup" />
          ) : (
            <a
              href={offer.ctaLink}
              className="block w-full bg-gold hover:bg-gold-light text-navy font-bold py-3.5 rounded-lg transition-all uppercase text-sm tracking-wide text-center"
            >
              {offer.ctaText}
            </a>
          )}

          {offerType === "book-call" && (
            <p className="text-center text-gold/70 text-xs mt-4 font-medium tracking-wide uppercase">
              Limited availability &mdash; first come, first served
            </p>
          )}

          <p className="text-center text-gray-500 text-xs mt-4">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
