"use client";

import { useEffect, useState } from "react";
import type { SessionStats } from "@/lib/live-session";

/**
 * Stream overlay. Added to XSplit as a Webpage source over the chart.
 * Transparent everywhere except the cards, so it can sit anywhere.
 *
 * Cards, top to bottom: scoreboard, plan bar, account rules, upcoming USD
 * news. Session data polls every 5 s; news polls every 60 s.
 */
const POLL_MS = 5000;
const NEWS_POLL_MS = 60_000;
const TOAST_MS = 45_000;

const GOLD = "#c9a84c";
const GREEN = "#2ec27e";
const RED = "#e5484d";
const AMBER = "#f0b429";
const MUTED = "#aab4c3";
const DIM = "#6b7a8c";

const CARD: React.CSSProperties = {
  background: "rgba(7,18,32,0.88)",
  border: `2px solid ${GOLD}`,
  borderRadius: 14,
  boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
};
const LABEL: React.CSSProperties = { fontSize: 12, letterSpacing: 2, color: MUTED, fontWeight: 700 };
const HEADING = "var(--font-heading), Impact, sans-serif";
const BODY = "var(--font-body), Arial, sans-serif";

interface NewsEvent {
  title: string;
  impact: "High" | "Medium";
  at: string;
}

function fmtR(r: number): string {
  const v = Math.round(r * 100) / 100;
  return `${v > 0 ? "+" : ""}${v}R`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function fmtDay(iso: string, now: number): string {
  const d = new Date(iso);
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return "Today";
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function countdown(iso: string, now: number): { text: string; color: string } | null {
  const ms = new Date(iso).getTime() - now;
  if (ms < -20 * 60 * 1000) return null;
  if (ms <= 0) return { text: "NOW", color: RED };
  const m = Math.ceil(ms / 60000);
  if (m > 120) return null;
  const text = m >= 60 ? `in ${Math.floor(m / 60)}h ${m % 60}m` : `in ${m}m`;
  return { text, color: m <= 15 ? RED : m <= 45 ? AMBER : MUTED };
}

export default function LiveOverlay() {
  const [s, setS] = useState<SessionStats | null>(null);
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/live/session", { cache: "no-store" });
        if (!r.ok) return; // keep the last good numbers on screen
        const j = await r.json();
        if (alive) {
          setS(j.stats);
          setNow(Date.now());
        }
      } catch {
        // keep the last numbers on screen
      }
    };
    const loadNews = async () => {
      try {
        const r = await fetch("/api/live/news", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (alive && Array.isArray(j.events)) setNews(j.events);
      } catch {
        // keep the last list
      }
    };
    load();
    loadNews();
    const id = setInterval(load, POLL_MS);
    const nid = setInterval(loadNews, NEWS_POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
      clearInterval(nid);
    };
  }, []);

  // Before the first successful poll (or while GitHub is unavailable on a cold
  // start) draw the card with dashes so the stream never shows an empty box.
  const loaded = s !== null;
  const netColor = !loaded ? "#ffffff" : s.netR > 0 ? GREEN : s.netR < 0 ? RED : "#ffffff";
  const statusLabel = !loaded ? "--" : s.status === "flat" ? "FLAT" : s.status.toUpperCase();
  const statusColor = !loaded ? GOLD : s.status === "flat" ? GOLD : s.status === "long" ? GREEN : RED;
  const showToast = loaded && s.last && now - new Date(s.last.closedAt).getTime() < TOAST_MS;

  const cell = (label: string, value: string, color = "#ffffff") => (
    <div style={{ minWidth: 96, padding: "0 14px" }}>
      <div style={LABEL}>{label}</div>
      <div style={{ fontSize: 34, lineHeight: 1.05, color, fontFamily: HEADING, fontWeight: 700 }}>{value}</div>
    </div>
  );

  // Same label-over-value layout, regular body font, wraps to two lines.
  const textCell = (label: string, value: string) => (
    <div style={{ flex: "1 1 0", minWidth: 170, maxWidth: 340, padding: "0 14px" }}>
      <div style={LABEL}>{label}</div>
      <div style={{ fontSize: 19, lineHeight: 1.3, color: value ? "#ffffff" : DIM, fontFamily: BODY, fontWeight: 400, letterSpacing: 0.2, marginTop: 2 }}>
        {value || "--"}
      </div>
    </div>
  );

  const rules = loaded ? s.rules : null;
  const upcoming = news.filter((e) => new Date(e.at).getTime() >= now - 20 * 60 * 1000).slice(0, 4);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, display: "inline-flex", flexDirection: "column", alignItems: "stretch", gap: 10, padding: 6, fontFamily: BODY }}>
      {/* Scoreboard */}
      <div style={{ ...CARD, display: "flex", alignItems: "center", gap: 4, padding: "10px 8px" }}>
        {cell("TODAY", "R2F", GOLD)}
        {cell("TRADES", loaded ? String(s.trades) : "--")}
        {cell("W / L", loaded ? `${s.wins} / ${s.losses}` : "-- / --")}
        {cell("NET", loaded ? fmtR(s.netR) : "--", netColor)}
        {cell("STATUS", statusLabel, statusColor)}
        {loaded && s.open && (
          <div style={{ padding: "0 14px", fontSize: 14, color: "#e8ecf1", maxWidth: 180 }}>
            {s.open.setup || "in trade"}
            {s.open.carried && <div style={{ color: GOLD, fontSize: 11, letterSpacing: 1 }}>CARRIED OVER</div>}
          </div>
        )}
      </div>

      {/* Plan bar */}
      {loaded && (
        <div style={{ ...CARD, display: "flex", alignItems: "flex-start", gap: 4, padding: "10px 8px" }}>
          {textCell("BIAS", s.plan.bias)}
          {textCell("TARGET", s.plan.target)}
          {textCell("WAITING FOR", s.plan.waiting)}
        </div>
      )}

      {/* Account rules */}
      {rules && (rules.risk || rules.target || rules.extra) && (
        <div style={{ ...CARD, padding: "10px 22px" }}>
          <div style={LABEL}>ACCOUNT RULES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 0", marginTop: 2, fontSize: 19, color: "#ffffff", fontFamily: BODY }}>
            {[
              rules.risk && `Risk ${rules.risk}`,
              rules.target && `Target ${rules.target}`,
              rules.extra,
            ]
              .filter(Boolean)
              .map((t, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: GOLD, padding: "0 12px" }}>|</span>}
                  {t}
                </span>
              ))}
          </div>
          {rules.note && <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{rules.note}</div>}
        </div>
      )}

      {/* Upcoming USD news */}
      {upcoming.length > 0 && (
        <div style={{ ...CARD, padding: "10px 22px" }}>
          <div style={LABEL}>USD NEWS THIS WEEK</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto auto 1fr auto", columnGap: 14, rowGap: 3, marginTop: 4, fontSize: 17, color: "#ffffff", fontFamily: BODY, alignItems: "baseline" }}>
            {upcoming.map((e) => {
              const cd = countdown(e.at, now);
              return (
                <div key={e.at + e.title} style={{ display: "contents" }}>
                  <span style={{ color: MUTED, fontSize: 14 }}>{fmtDay(e.at, now)}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtTime(e.at)}</span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 360 }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: e.impact === "High" ? RED : AMBER, marginRight: 8, verticalAlign: "middle" }} />
                    {e.title}
                  </span>
                  <span style={{ color: cd ? cd.color : DIM, fontWeight: cd && cd.color === RED ? 700 : 400, fontSize: 15, textAlign: "right" }}>{cd ? cd.text : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Last trade toast */}
      {loaded && showToast && s.last && (
        <div style={{ ...CARD, borderColor: s.last.r > 0 ? GREEN : s.last.r < 0 ? RED : GOLD, borderRadius: 12, padding: "8px 16px", color: "#ffffff" }}>
          <div style={{ ...LABEL, fontSize: 11 }}>LAST TRADE</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {s.last.side.toUpperCase()} &nbsp;|&nbsp; <span style={{ color: s.last.r > 0 ? GREEN : s.last.r < 0 ? RED : GOLD }}>{fmtR(s.last.r)}</span>
            {s.last.setup && <> &nbsp;|&nbsp; {s.last.setup}</>}
          </div>
        </div>
      )}
    </div>
  );
}
