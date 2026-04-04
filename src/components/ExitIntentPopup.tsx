"use client";

import { useState, useEffect, useCallback } from "react";
import EmailSignup from "@/components/EmailSignup";

export default function ExitIntentPopup() {
  const [show, setShow] = useState(false);

  const trigger = useCallback(() => {
    if (sessionStorage.getItem("r2f_exit_shown")) return;
    sessionStorage.setItem("r2f_exit_shown", "1");
    setShow(true);
  }, []);

  useEffect(() => {
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

    // Wait 30 seconds before enabling — let visitors engage with content first
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
      window.addEventListener("scroll", handleScroll, { passive: true });
    }, 30000);

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

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => setShow(false)}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShow(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

        <div className="text-center mb-6">
          <p className="text-3xl mb-3">📊</p>
          <h2
            className="text-2xl font-bold text-navy mb-2"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Wait! Don&rsquo;t Leave Empty-Handed
          </h2>
          <p className="text-gray-500 text-sm">
            Get the free <strong>ICT Trading Checklist</strong> — the exact checklist I use before every trade.
          </p>
        </div>

        <EmailSignup variant="popup" />

        <p className="text-center text-gray-400 text-xs mt-4">
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
