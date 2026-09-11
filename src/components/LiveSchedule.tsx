"use client";

import { useSyncExternalStore } from "react";

/**
 * Shows the next stream start in the visitor's own time zone.
 *
 * The stream goes live at the 8:00 AM London open on weekdays. London is UTC+1
 * until the UK clocks go back on 25 Oct 2026 and UTC+0 after that, so the UTC
 * start hour flips from 7 to 8 on that date. Rendered on the client so the
 * time matches the visitor, not the server; the server snapshot is null so
 * hydration never mismatches.
 */
const STREAM_HOURS = 3;

function nextStart(now: Date): Date {
  const flip = Date.UTC(2026, 9, 25, 1, 0, 0); // 25 Oct 2026 01:00 UTC
  const d = new Date(now);
  const hourUtc = d.getTime() >= flip ? 8 : 7;
  d.setUTCHours(hourUtc, 0, 0, 0);
  // Today's stream is over: move to tomorrow.
  if (d.getTime() < now.getTime() - STREAM_HOURS * 60 * 60 * 1000) d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

type Snapshot = { label: string; liveNow: boolean } | null;

let cached: Snapshot = null;

function getSnapshot(): Snapshot {
  if (cached) return cached;
  const now = new Date();
  const start = nextStart(now);
  const sinceStart = now.getTime() - start.getTime();
  cached = {
    liveNow: sinceStart >= 0 && sinceStart < STREAM_HOURS * 60 * 60 * 1000,
    label: start.toLocaleString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }),
  };
  return cached;
}

function getServerSnapshot(): Snapshot {
  return null;
}

function subscribe() {
  return () => {};
}

export default function LiveSchedule() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!snap) return <p className="text-white/60 text-sm h-5" aria-hidden="true" />;

  return (
    <p className="text-white/80 text-sm">
      {snap.liveNow ? (
        <span className="inline-flex items-center gap-2 font-bold text-white">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          Live right now. Scroll down to watch.
        </span>
      ) : (
        <>
          Next stream in your time zone: <span className="font-bold text-gold">{snap.label}</span>
        </>
      )}
    </p>
  );
}
