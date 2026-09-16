"use client";

import { useEffect, useState } from "react";
import type { SessionStats } from "@/lib/live-session";

/**
 * Stream scoreboard. Added to XSplit as a Webpage source over the chart.
 * Transparent everywhere except the two cards, so it can sit anywhere.
 * Polls the public session endpoint every 4 seconds.
 */
const POLL_MS = 4000;
const TOAST_MS = 45_000;

const GOLD = "#c9a84c";
const GREEN = "#2ec27e";
const RED = "#e5484d";

function fmtR(r: number): string {
  const v = Math.round(r * 100) / 100;
  return `${v > 0 ? "+" : ""}${v}R`;
}

export default function LiveOverlay() {
  const [s, setS] = useState<SessionStats | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/live/session", { cache: "no-store" });
        const j = await r.json();
        if (alive) {
          setS(j.stats);
          setNow(Date.now());
        }
      } catch {
        // keep the last numbers on screen
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!s) return null;

  const netColor = s.netR > 0 ? GREEN : s.netR < 0 ? RED : "#ffffff";
  const statusLabel = s.status === "flat" ? "FLAT" : s.status.toUpperCase();
  const statusColor = s.status === "flat" ? GOLD : s.status === "long" ? GREEN : RED;
  const showToast = s.last && now - new Date(s.last.closedAt).getTime() < TOAST_MS;

  const cell = (label: string, value: string, color = "#ffffff") => (
    <div style={{ minWidth: 96, padding: "0 14px" }}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: "#aab4c3", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 34, lineHeight: 1.05, color, fontFamily: "var(--font-heading), Impact, sans-serif", fontWeight: 700 }}>{value}</div>
    </div>
  );

  return (
    <div style={{ position: "fixed", top: 0, left: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, padding: 6, fontFamily: "var(--font-body), Arial, sans-serif" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "10px 8px",
          background: "rgba(7,18,32,0.88)",
          border: `2px solid ${GOLD}`,
          borderRadius: 14,
          boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
        }}
      >
        {cell("TODAY", "R2F", GOLD)}
        {cell("TRADES", String(s.trades))}
        {cell("W / L", `${s.wins} / ${s.losses}`)}
        {cell("NET", fmtR(s.netR), netColor)}
        {cell("STATUS", statusLabel, statusColor)}
        {s.open && (
          <div style={{ padding: "0 14px", fontSize: 14, color: "#e8ecf1", maxWidth: 180 }}>
            {s.open.setup || "in trade"}
            {s.open.carried && <div style={{ color: GOLD, fontSize: 11, letterSpacing: 1 }}>CARRIED OVER</div>}
          </div>
        )}
      </div>

      {showToast && s.last && (
        <div
          style={{
            padding: "8px 16px",
            background: "rgba(7,18,32,0.88)",
            border: `2px solid ${s.last.r > 0 ? GREEN : s.last.r < 0 ? RED : GOLD}`,
            borderRadius: 12,
            color: "#ffffff",
            boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#aab4c3", fontWeight: 700 }}>LAST TRADE</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {s.last.side.toUpperCase()} &nbsp;|&nbsp; <span style={{ color: s.last.r > 0 ? GREEN : s.last.r < 0 ? RED : GOLD }}>{fmtR(s.last.r)}</span>
            {s.last.setup && <> &nbsp;|&nbsp; {s.last.setup}</>}
          </div>
        </div>
      )}
    </div>
  );
}
