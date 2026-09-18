"use client";

import { useCallback, useEffect, useState } from "react";
import type { Action, LiveSession, SessionStats, Side } from "@/lib/live-session";

/**
 * Phone-sized control panel for the stream scoreboard. Big buttons, one
 * action per tap. Every tap commits to data/live-session.json and the overlay
 * picks it up within a few seconds.
 */
const R_CHIPS = [0.5, 1, 1.5, 2, 2.5, 3];

export default function LiveSessionPage() {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [setup, setSetup] = useState("");
  const [plan, setPlan] = useState({ bias: "", target: "", waiting: "" });
  const [rules, setRules] = useState({ risk: "", target: "", extra: "", note: "" });
  const [r, setR] = useState("1");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/live/session", { cache: "no-store" });
    if (!r.ok) { setErr("GitHub is rate limited right now; the panel will work again when it resets."); return; }
    const j = await r.json();
    setSession(j.session);
    setStats(j.stats);
    if (j.stats?.plan) setPlan(j.stats.plan);
    if (j.stats?.rules) setRules(j.stats.rules);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function send(action: Action) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/live-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const text = await res.text();
      let j: { error?: string; session?: LiveSession; stats?: SessionStats } = {};
      try { j = text ? JSON.parse(text) : {}; } catch { /* not JSON */ }
      if (!res.ok || !j.session) throw new Error(j.error || `HTTP ${res.status}: ${text.slice(0, 120) || "empty response"}`);
      setSession(j.session);
      setStats(j.stats ?? null);
      if (j.stats?.plan) setPlan(j.stats.plan);
      if (j.stats?.rules) setRules(j.stats.rules);
      if (action.type === "close" || action.type === "open") setSetup("");
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  const rNum = parseFloat(r);
  const rOk = Number.isFinite(rNum) && rNum >= 0;
  const inTrade = !!session?.open;

  const big = "w-full py-5 rounded-xl font-black text-xl tracking-wide disabled:opacity-40 transition-colors";

  return (
    <div className="max-w-md mx-auto p-4 space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-white">Live Scoreboard</h1>
        <span className="text-xs text-white/50">{session?.date || ""}</span>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-2 text-center bg-white/5 rounded-xl p-3">
          <Stat label="Trades" value={String(stats.trades)} />
          <Stat label="W / L" value={`${stats.wins} / ${stats.losses}`} />
          <Stat label="Net" value={`${stats.netR > 0 ? "+" : ""}${stats.netR}R`} color={stats.netR > 0 ? "text-green-400" : stats.netR < 0 ? "text-red-400" : "text-white"} />
          <Stat label="Status" value={stats.status.toUpperCase()} color={stats.status === "flat" ? "text-gold" : stats.status === "long" ? "text-green-400" : "text-red-400"} />
        </div>
      )}

      {err && <p className="text-red-400 text-sm">{err}</p>}

      <form
        onSubmit={(e) => { e.preventDefault(); send({ type: "plan", ...plan }); }}
        className="space-y-2 bg-white/5 rounded-xl p-3"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-white/60 text-xs uppercase tracking-wider">Plan bar (shows on stream)</h2>
          <button type="submit" disabled={busy} className="text-xs font-bold bg-gold text-navy px-3 py-1.5 rounded-md disabled:opacity-40">Update</button>
        </div>
        {(["bias", "target", "waiting"] as const).map((k) => (
          <input
            key={k}
            value={plan[k]}
            onChange={(e) => setPlan({ ...plan, [k]: e.target.value })}
            maxLength={60}
            placeholder={k === "bias" ? "Bias: SHORT under 20,150" : k === "target" ? "Target: Asia low 20,080" : "Waiting for: 5m FVG to fill"}
            className="w-full px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-gold text-sm"
          />
        ))}
      </form>

      <form
        onSubmit={(e) => { e.preventDefault(); send({ type: "rules", ...rules }); }}
        className="space-y-2 bg-white/5 rounded-xl p-3"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-white/60 text-xs uppercase tracking-wider">Account rules (shows on stream)</h2>
          <button type="submit" disabled={busy} className="text-xs font-bold bg-gold text-navy px-3 py-1.5 rounded-md disabled:opacity-40">Update</button>
        </div>
        {(["risk", "target", "extra", "note"] as const).map((k) => (
          <input
            key={k}
            value={rules[k]}
            onChange={(e) => setRules({ ...rules, [k]: e.target.value })}
            maxLength={80}
            placeholder={k === "risk" ? "Risk: 10% per trade" : k === "target" ? "Target: 1R" : k === "extra" ? "Extra rule (optional): max 2 trades a day" : "Footnote: Small account, aggressive growth phase. Not advice."}
            className="w-full px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-gold text-sm"
          />
        ))}
      </form>

      {!inTrade ? (
        <div className="space-y-3">
          <input
            value={setup}
            onChange={(e) => setSetup(e.target.value)}
            placeholder="Setup (optional): FVG retest, OB, sweep..."
            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-gold"
          />
          <div className="grid grid-cols-2 gap-3">
            <button disabled={busy} onClick={() => send({ type: "open", side: "long" as Side, setup })} className={`${big} bg-green-600 hover:bg-green-500 text-white`}>LONG</button>
            <button disabled={busy} onClick={() => send({ type: "open", side: "short" as Side, setup })} className={`${big} bg-red-600 hover:bg-red-500 text-white`}>SHORT</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-white/70 text-sm">
            In a <span className="font-bold text-white">{session!.open!.side.toUpperCase()}</span>
            {session!.open!.setup && <> ({session!.open!.setup})</>}
            {session!.open!.carried && <span className="text-gold"> carried over</span>}. Close it:
          </p>
          <div className="flex gap-2 flex-wrap">
            {R_CHIPS.map((c) => (
              <button key={c} onClick={() => setR(String(c))} className={`px-4 py-2 rounded-full text-sm font-bold ${r === String(c) ? "bg-gold text-navy" : "bg-white/10 text-white"}`}>{c}R</button>
            ))}
            <input
              value={r}
              onChange={(e) => setR(e.target.value)}
              inputMode="decimal"
              className="w-24 px-3 py-2 rounded-full bg-white/10 text-white text-center border border-white/10 focus:outline-none focus:border-gold"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button disabled={busy || !rOk} onClick={() => send({ type: "close", result: "win", r: rNum })} className={`${big} bg-green-600 hover:bg-green-500 text-white`}>WIN</button>
            <button disabled={busy || !rOk} onClick={() => send({ type: "close", result: "loss", r: rNum })} className={`${big} bg-red-600 hover:bg-red-500 text-white`}>LOSS</button>
            <button disabled={busy} onClick={() => send({ type: "close", result: "be", r: 0 })} className={`${big} bg-white/15 hover:bg-white/25 text-white`}>B/E</button>
          </div>
          <button disabled={busy} onClick={() => send({ type: "cancel" })} className="w-full py-3 rounded-lg text-white/60 text-sm hover:text-white">Cancel this trade (no fill)</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button disabled={busy || !session || (session.trades.length === 0 && !session.open)} onClick={() => send({ type: "undo" })} className="py-3 rounded-lg bg-white/10 text-white font-bold disabled:opacity-40">Undo last</button>
        <button
          disabled={busy}
          onClick={() => {
            const carry = inTrade && confirm("You are in a trade. Carry it into the new session? Cancel = discard it.");
            if (!confirm("Start a new session? Today's trades are cleared from the overlay (they stay in the git history).")) return;
            send({ type: "new", carry });
          }}
          className="py-3 rounded-lg bg-gold text-navy font-bold"
        >
          New session
        </button>
      </div>

      {session && session.trades.length > 0 && (
        <div className="pt-2">
          <h2 className="text-white/60 text-xs uppercase tracking-wider mb-2">Today</h2>
          <ul className="space-y-1">
            {[...session.trades].reverse().map((t) => (
              <li key={t.id} className="flex justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
                <span className="text-white/80">
                  {t.side.toUpperCase()} {t.setup && <span className="text-white/50">· {t.setup}</span>}
                  {t.carried && <span className="text-gold"> · carried</span>}
                </span>
                <span className={`font-bold ${t.r > 0 ? "text-green-400" : t.r < 0 ? "text-red-400" : "text-white"}`}>{t.r > 0 ? "+" : ""}{t.r}R</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-white/40 text-xs pt-4">
        Overlay for XSplit: <span className="text-white/70">https://www.r2ftrading.com/live/overlay</span>
      </p>
    </div>
  );
}

function Stat({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
      <div className={`text-lg font-black ${color}`}>{value}</div>
    </div>
  );
}
