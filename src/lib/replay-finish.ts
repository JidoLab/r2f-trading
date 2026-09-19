import type { LiveSession } from "@/lib/live-session";
import { stats } from "@/lib/live-session";

/**
 * Turn a day's scoreboard log into what the replay needs: YouTube chapters
 * (timestamps in the description) and a result-based title.
 *
 * Chapter times are trade events measured from the broadcast's actual start.
 * Events before the stream went live (a trade opened during Starting Soon)
 * are dropped for the open marker but kept for the close, which is what the
 * viewer can actually watch.
 */

const GENERIC_TITLE = /^(Live Trading ICT Concepts|NQ Live Trading ICT|R2F LIVE Day Trading)/i;
const CHAPTERS_MARK = "CHAPTERS";

export interface VideoSnippet {
  title: string;
  description: string;
  categoryId?: string;
  tags?: string[];
  defaultLanguage?: string;
}

function ts(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

function rLabel(r: number): string {
  return `${r > 0 ? "+" : ""}${Math.round(r * 100) / 100}R`;
}

export function buildChapters(session: LiveSession, actualStartIso: string): string[] {
  const start = new Date(actualStartIso).getTime();
  const events: { t: number; text: string }[] = [];
  session.trades.forEach((tr, i) => {
    const n = i + 1;
    const side = tr.side === "long" ? "Long" : "Short";
    const setup = tr.setup ? `, ${tr.setup}` : "";
    const open = (new Date(tr.openedAt).getTime() - start) / 1000;
    const close = (new Date(tr.closedAt).getTime() - start) / 1000;
    if (open >= 10) events.push({ t: open, text: `Trade ${n}: ${side} entry${setup}` });
    if (close >= 10 && close - open >= 10) events.push({ t: close, text: `Trade ${n} closed: ${rLabel(tr.r)}` });
    else if (close >= 10 && open < 10) events.push({ t: close, text: `Trade ${n} closed: ${side}${setup}, ${rLabel(tr.r)}` });
  });
  events.sort((a, b) => a.t - b.t);
  // YouTube needs chapters at least 10 s apart.
  const lines = ["0:00 Stream start, bias and levels"];
  let last = 0;
  for (const e of events) {
    if (e.t - last < 10) continue;
    lines.push(`${ts(e.t)} ${e.text}`);
    last = e.t;
  }
  return lines;
}

export function resultSentence(session: LiveSession): string {
  const st = stats(session);
  if (st.trades === 0) return "No trades taken this session.";
  const parts = [`${st.trades} trade${st.trades === 1 ? "" : "s"}`];
  if (st.wins) parts.push(`${st.wins} win${st.wins === 1 ? "" : "s"}`);
  if (st.losses) parts.push(`${st.losses} loss${st.losses === 1 ? "" : "es"}`);
  if (st.breakEven) parts.push(`${st.breakEven} break-even`);
  return `Session result: ${parts.join(", ")}, ${rLabel(st.netR)}.`;
}

/** Result-based replay title, under 80 characters. */
export function buildTitle(session: LiveSession, dateLabel: string): string {
  const st = stats(session);
  let head: string;
  if (st.trades === 0) head = "No Trade Day";
  else {
    const named = session.trades.find((t) => t.setup);
    const w = st.wins ? `${st.wins} Win${st.wins === 1 ? "" : "s"}` : "";
    const l = st.losses ? `${st.losses} Loss${st.losses === 1 ? "" : "es"}` : "";
    const wl = [w, l].filter(Boolean).join(" ");
    head = named && st.trades === 1
      ? `${named.setup} ${named.side === "long" ? "Long" : "Short"}, ${rLabel(st.netR)}`
      : `${wl}, ${rLabel(st.netR)}`;
  }
  return `NQ London Session Live: ${head} | ICT | ${dateLabel}`.slice(0, 100);
}

/**
 * Apply chapters and title to a snippet. Idempotent: an existing CHAPTERS
 * block is replaced, and the title is only replaced while it is still the
 * generic live title (a hand-written title is never overwritten).
 */
export function finishSnippet(snippet: VideoSnippet, session: LiveSession, actualStartIso: string, dateLabel: string): VideoSnippet {
  const chapters = buildChapters(session, actualStartIso);
  const block = `${CHAPTERS_MARK}\n${chapters.join("\n")}\n\n${resultSentence(session)}`;
  const idx = snippet.description.indexOf(`\n${CHAPTERS_MARK}\n`);
  const base = idx >= 0 ? snippet.description.slice(0, idx).trimEnd() : snippet.description.trimEnd();
  // Chapters go near the top so search snippets and the mobile description show them.
  const firstBreak = base.indexOf("\n\n");
  const description = firstBreak > 0
    ? `${base.slice(0, firstBreak)}\n\n${block}\n${base.slice(firstBreak)}`
    : `${base}\n\n${block}`;
  const title = GENERIC_TITLE.test(snippet.title) ? buildTitle(session, dateLabel) : snippet.title;
  return { ...snippet, title, description };
}

export function dateLabelBangkok(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
}
