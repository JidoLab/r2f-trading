// Client-side GA4 event tracking utility
// Fire-and-forget — never blocks rendering

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined" || !window.gtag) return;
  try {
    window.gtag("event", eventName, params);
  } catch {}
}

// Facebook Pixel event tracking
export function trackFBEvent(event: string, data?: Record<string, unknown>) {
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", event, data);
  }
}

// Google Ads conversion tracking
export function trackGoogleConversion(conversionId: string) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "conversion", { send_to: conversionId });
  }
}

// Also send to our lead scoring API (fire-and-forget)
export function trackEngagement(
  eventType: string,
  metadata?: Record<string, string>
) {
  trackEvent(eventType, metadata);

  // Send to scoring API
  const email = typeof window !== "undefined" ? localStorage.getItem("r2f_subscriber_email") : null;
  if (!email) return;

  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, event: eventType, metadata }),
  }).catch(() => {});
}
