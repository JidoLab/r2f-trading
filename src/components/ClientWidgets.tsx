"use client";

/**
 * Lazy-mounted wrapper for the 5 floating widgets that sit on every page.
 *
 * Why this exists:
 * PSI audit (2026-05-26) showed 2.1s mobile / 2.5s desktop main-thread work
 * and 610 KiB of unused JavaScript shipping with first paint. Most of that
 * is the widget stack hydrating before it's needed:
 *   - ChatWidget — Claude-backed chat with state + effects
 *   - SocialProof — polls /api/social-proof on mount
 *   - ExitIntentPopup — only fires on mouseleave
 *   - WhatsAppButton + BackToTop — trivial but still bundled with the rest
 *
 * Splitting each via next/dynamic with ssr:false:
 *   - removes them from the initial HTML payload
 *   - moves their bundles into separate chunks loaded post-hydration
 *   - drops main-thread blocking time and unused JS at first paint
 *
 * The widgets still appear to the user instantly after page load —
 * we're just yielding to the LCP/TTI render first.
 */

import dynamic from "next/dynamic";

const WhatsAppButton  = dynamic(() => import("@/components/WhatsAppButton"),  { ssr: false, loading: () => null });
const BackToTop       = dynamic(() => import("@/components/BackToTop"),       { ssr: false, loading: () => null });
const ChatWidget      = dynamic(() => import("@/components/ChatWidget"),      { ssr: false, loading: () => null });
const ExitIntentPopup = dynamic(() => import("@/components/ExitIntentPopup"), { ssr: false, loading: () => null });
const SocialProof     = dynamic(() => import("@/components/SocialProof"),     { ssr: false, loading: () => null });

export default function ClientWidgets() {
  return (
    <>
      <WhatsAppButton />
      <BackToTop />
      <ChatWidget />
      <ExitIntentPopup />
      <SocialProof />
    </>
  );
}
