import { NextResponse } from "next/server";

/**
 * Upcoming high and medium impact USD events for the stream overlay.
 *
 * Source: the ForexFactory calendar feed (same one FF Alerts uses). It is
 * fetched through Next's data cache for an hour, so the overlay polling it
 * every minute costs nothing upstream. Times in the feed carry their own
 * offset; they are passed through as ISO strings and the overlay formats them
 * in the viewer's zone.
 */
export const dynamic = "force-dynamic";

const FEED = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const LOOKBACK_MS = 20 * 60 * 1000;
const MAX_EVENTS = 6;

interface FfEvent {
  title: string;
  country: string;
  date: string;
  impact: "High" | "Medium" | "Low" | "Holiday";
  forecast?: string;
  previous?: string;
}

export async function GET() {
  try {
    const res = await fetch(FEED, {
      headers: { "User-Agent": "Mozilla/5.0 (R2F Trading stream overlay)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    const all = (await res.json()) as FfEvent[];
    const now = Date.now();
    const events = all
      .filter((e) => e.country === "USD" && (e.impact === "High" || e.impact === "Medium"))
      .map((e) => ({ title: e.title, impact: e.impact, at: new Date(e.date).toISOString(), forecast: e.forecast || "", previous: e.previous || "" }))
      .filter((e) => new Date(e.at).getTime() >= now - LOOKBACK_MS)
      .sort((a, b) => a.at.localeCompare(b.at))
      .slice(0, MAX_EVENTS);
    return NextResponse.json({ events, fetchedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ events: [], error: String(err) }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
