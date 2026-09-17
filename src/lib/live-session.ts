/**
 * Live stream session scoreboard.
 *
 * One JSON file in the GitHub datastore holds the current session: the open
 * trade (if any) and the closed trades for the day. Harvest logs trades from
 * /admin/live-session on his phone; the overlay at /live/overlay polls
 * /api/live/session and renders the numbers on top of the chart in XSplit.
 *
 * Everything is in R (risk multiples), never currency. A trade carried over
 * from a previous day is flagged so the overlay can say so, and its result
 * counts in the day it closes.
 */

export const SESSION_PATH = "data/live-session.json";

export type Side = "long" | "short";
export type Result = "win" | "loss" | "be";

export interface OpenTrade {
  side: Side;
  setup: string;
  openedAt: string;
  carried: boolean;
}

export interface ClosedTrade {
  id: string;
  side: Side;
  setup: string;
  result: Result;
  r: number;
  openedAt: string;
  closedAt: string;
  carried: boolean;
}

export interface Plan {
  bias: string;
  target: string;
  waiting: string;
}

export const EMPTY_PLAN: Plan = { bias: "", target: "", waiting: "" };

export interface LiveSession {
  date: string; // YYYY-MM-DD in Asia/Bangkok
  startedAt: string;
  open: OpenTrade | null;
  trades: ClosedTrade[];
  plan: Plan;
  updatedAt: string;
}

export interface SessionStats {
  trades: number;
  wins: number;
  losses: number;
  breakEven: number;
  netR: number;
  avgWinR: number | null;
  status: "flat" | Side;
  open: OpenTrade | null;
  last: ClosedTrade | null;
  plan: Plan;
}

export function bangkokDate(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

export function emptySession(now = new Date()): LiveSession {
  return { date: bangkokDate(now), startedAt: now.toISOString(), open: null, trades: [], plan: { ...EMPTY_PLAN }, updatedAt: now.toISOString() };
}

export function stats(s: LiveSession): SessionStats {
  const wins = s.trades.filter((t) => t.result === "win");
  const losses = s.trades.filter((t) => t.result === "loss");
  const be = s.trades.filter((t) => t.result === "be");
  const netR = Math.round(s.trades.reduce((a, t) => a + t.r, 0) * 100) / 100;
  const avgWinR = wins.length ? Math.round((wins.reduce((a, t) => a + t.r, 0) / wins.length) * 100) / 100 : null;
  return {
    trades: s.trades.length,
    wins: wins.length,
    losses: losses.length,
    breakEven: be.length,
    netR,
    avgWinR,
    status: s.open ? s.open.side : "flat",
    open: s.open,
    last: s.trades.length ? s.trades[s.trades.length - 1] : null,
    plan: s.plan || { ...EMPTY_PLAN },
  };
}

export type Action =
  | { type: "new"; carry?: boolean }
  | { type: "open"; side: Side; setup?: string }
  | { type: "close"; result: Result; r: number; setup?: string }
  | { type: "cancel" }
  | { type: "undo" }
  | { type: "plan"; bias?: string; target?: string; waiting?: string };

/** Pure transform used by updateJsonFile; may run more than once on conflict. */
export function apply(current: LiveSession | null, action: Action, now = new Date()): LiveSession {
  const s: LiveSession = current ? { ...current, trades: [...current.trades], plan: current.plan || { ...EMPTY_PLAN } } : emptySession(now);
  const iso = now.toISOString();
  switch (action.type) {
    case "new": {
      const carriedOpen = action.carry && s.open ? { ...s.open, carried: true } : null;
      // The plan is written before going live; a new session keeps it.
      return { ...emptySession(now), open: carriedOpen, plan: s.plan };
    }
    case "open": {
      if (s.open) return s; // already in a trade; close it first
      return { ...s, open: { side: action.side, setup: (action.setup || "").trim(), openedAt: iso, carried: false }, updatedAt: iso };
    }
    case "close": {
      const open = s.open || { side: "long" as Side, setup: "", openedAt: iso, carried: false };
      const signed = action.result === "loss" ? -Math.abs(action.r) : action.result === "be" ? 0 : Math.abs(action.r);
      const trade: ClosedTrade = {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        side: open.side,
        setup: (action.setup ?? open.setup ?? "").trim(),
        result: action.result,
        r: Math.round(signed * 100) / 100,
        openedAt: open.openedAt,
        closedAt: iso,
        carried: open.carried,
      };
      return { ...s, open: null, trades: [...s.trades, trade], updatedAt: iso };
    }
    case "cancel":
      return { ...s, open: null, updatedAt: iso };
    case "undo": {
      if (s.open) return { ...s, open: null, updatedAt: iso };
      return { ...s, trades: s.trades.slice(0, -1), updatedAt: iso };
    }
    case "plan": {
      const clip = (v: string | undefined) => (v ?? "").trim().slice(0, 60);
      return { ...s, plan: { bias: clip(action.bias), target: clip(action.target), waiting: clip(action.waiting) }, updatedAt: iso };
    }
  }
}

export const SESSION_TAG = "live-session";

/**
 * Cached read for the public endpoint. The overlay polls every few seconds
 * and every uncached read is one GitHub API call, which is how the token hit
 * GitHub's hourly rate limit on 2026-09-17 and writes started failing. The
 * fetch is cached for 5 seconds across all function instances and the write
 * route invalidates the tag, so a logged trade still shows within one poll.
 */
export async function readSessionCached(): Promise<LiveSession | null> {
  const repo = process.env.GITHUB_REPO || "JidoLab/r2f-trading";
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${SESSION_PATH}`, {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
      next: { revalidate: 5, tags: [SESSION_TAG] },
    });
    if (res.status === 404) return emptySession();
    // Rate limited or GitHub down: report failure so the overlay keeps the
    // numbers it already has instead of flashing zeros on stream.
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8")) as LiveSession;
    return parsed && parsed.date ? { ...parsed, plan: parsed.plan || { ...EMPTY_PLAN } } : emptySession();
  } catch {
    return null;
  }
}

