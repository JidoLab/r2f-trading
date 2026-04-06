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
