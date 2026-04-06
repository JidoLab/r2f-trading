// Lead scoring system — assigns points per event, calculates segment

export const EVENT_POINTS: Record<string, number> = {
  email_signup: 10,
  blog_read: 5,
  email_open: 3,
  email_click: 8,
  coaching_page_view: 15,
  contact_page_view: 20,
  calendly_click: 25,
};

export type Segment = "cold" | "warm" | "hot";

export function calculateSegment(score: number): Segment {
  if (score >= 50) return "hot";
  if (score >= 20) return "warm";
  return "cold";
}

export function getPointsForEvent(eventType: string): number {
  return EVENT_POINTS[eventType] || 2;
}

export interface SubscriberEvent {
  type: string;
  date: string;
  metadata?: Record<string, string>;
}

export interface ScoredSubscriber {
  email: string;
  date: string;
  dripsSent: number;
  score: number;
  segment: Segment;
  events: SubscriberEvent[];
  lastActivity: string;
  dripsHistory: string[];
}

// Ensure backward compatibility with old subscriber records
export function normalizeSubscriber(sub: Record<string, unknown>): ScoredSubscriber {
  return {
    email: (sub.email as string) || "",
    date: (sub.date as string) || new Date().toISOString(),
    dripsSent: (sub.dripsSent as number) || 0,
    score: (sub.score as number) || 0,
    segment: (sub.segment as Segment) || "cold",
    events: (sub.events as SubscriberEvent[]) || [],
    lastActivity: (sub.lastActivity as string) || (sub.date as string) || "",
    dripsHistory: (sub.dripsHistory as string[]) || [],
  };
}

// Add event and recalculate score
export function addEventToSubscriber(
  sub: ScoredSubscriber,
  eventType: string,
  metadata?: Record<string, string>
): ScoredSubscriber {
  const points = getPointsForEvent(eventType);
  const newEvent: SubscriberEvent = {
    type: eventType,
    date: new Date().toISOString(),
    metadata,
  };

  // Keep last 50 events to prevent unbounded growth
  const events = [...sub.events, newEvent].slice(-50);
  const score = sub.score + points;
  const segment = calculateSegment(score);

  return {
    ...sub,
    score,
    segment,
    events,
    lastActivity: newEvent.date,
  };
}
