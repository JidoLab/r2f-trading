"use client";

import { useEffect, useState, useCallback } from "react";

interface QueueItem {
  id: string;
  title: string;
  question: string;
  angle: string;
  targetKeyword: string;
  source: "gsc" | "manual";
  priority: "high" | "medium" | "low";
  addedAt: string;
  used: boolean;
  usedAt?: string;
  generatedSlug?: string;
}

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-red-400/15 text-red-300",
  medium: "bg-yellow-400/15 text-yellow-300",
  low: "bg-blue-400/15 text-blue-300",
};

export default function TopicQueuePage() {
  const [pending, setPending] = useState<QueueItem[]>([]);
  const [used, setUsed] = useState<QueueItem[]>([]);
  const [text, setText] = useState("");
  const [mining, setMining] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState("");
  const [gsc, setGsc] = useState<Record<string, unknown> | null>(null);
  const [testing, setTesting] = useState(false);
  const [miningGsc, setMiningGsc] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/topic-queue");
    if (res.ok) {
      const d = await res.json();
      setPending(d.pending || []);
      setUsed(d.used || []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function mine() {
    if (!text.trim()) return;
    setMining(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/topic-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", text }),
      });
      const d = await res.json();
      if (res.ok) {
        setMsg(`Added ${d.added} topic${d.added === 1 ? "" : "s"} to the queue.`);
        setText("");
        await load();
      } else {
        setMsg(d.error || "Failed to mine questions.");
      }
    } finally {
      setMining(false);
    }
  }

  async function generateNext() {
    setGenerating(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/topic-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const d = await res.json();
      if (res.ok && d.result?.slug) {
        setMsg(`Published: "${d.result.title}" (/trading-insights/${d.result.slug})`);
      } else if (res.ok) {
        setMsg(d.result?.reason ? `Skipped: ${d.result.reason}` : "Triggered. Check Blog Posts shortly.");
      } else {
        setMsg(d.error || "Generation failed.");
      }
      await load();
    } finally {
      setGenerating(false);
    }
  }

  async function testGsc() {
    setTesting(true);
    setGsc(null);
    try {
      const res = await fetch("/api/admin/test-gsc");
      setGsc(await res.json());
    } finally {
      setTesting(false);
    }
  }

  async function mineGsc() {
    setMiningGsc(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/topic-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mine-gsc" }),
      });
      const d = await res.json();
      if (res.ok && d.result?.suggestionsCount != null) {
        setMsg(`Mined ${d.result.suggestionsCount} GSC suggestion${d.result.suggestionsCount === 1 ? "" : "s"} into the queue.`);
      } else if (res.ok && d.result?.skipped) {
        setMsg(`GSC miner: ${d.result.reason || "nothing new to mine right now."}`);
      } else {
        setMsg(d.error || "GSC mine failed.");
      }
      await load();
    } finally {
      setMiningGsc(false);
    }
  }

  async function remove(id: string) {
    await fetch("/api/admin/topic-queue", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-1">Topic Queue</h1>
      <p className="text-white/50 text-sm mb-6">
        Paste real search questions (e.g. from Google Search Console) and AI turns them into ranked,
        on-brand blog ideas. The daily blog generator pulls from this queue first, so your posts answer
        what people actually search.
      </p>

      {/* GSC connection status */}
      <div className="bg-navy border border-white/10 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-white/80 text-sm font-semibold">Google Search Console</span>
            <span className="text-white/40 text-xs ml-2">auto-mining (optional)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={mineGsc}
              disabled={miningGsc}
              className="bg-gold/90 hover:bg-gold text-navy text-xs font-bold px-3 py-1.5 rounded-md disabled:opacity-40"
            >
              {miningGsc ? "Mining…" : "Mine GSC now"}
            </button>
            <button
              onClick={testGsc}
              disabled={testing}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-md disabled:opacity-40"
            >
              {testing ? "Testing…" : "Test connection"}
            </button>
          </div>
        </div>
        {gsc && (
          <div className="mt-3 text-xs space-y-1.5 border-t border-white/10 pt-3">
            <p className={(gsc.ok ? "text-green-400" : "text-yellow-300") + " font-semibold"}>
              {gsc.ok ? "✓ Connected" : gsc.configured ? "⚠ Configured but not returning data" : "⚠ Not configured yet"}
            </p>
            <p className="text-white/50">
              Key present: {gsc.hasKey ? (gsc.keyParses ? "yes ✓" : "yes, but not valid JSON ✗") : "no ✗"}
              {"  ·  "}Site URL: {gsc.hasSiteUrl ? `yes (${String(gsc.siteUrl)})` : "missing ✗"}
            </p>
            {gsc.clientEmail ? (
              <p className="text-white/60">
                Service account to grant access in Search Console:{" "}
                <span className="text-gold break-all">{String(gsc.clientEmail)}</span>
              </p>
            ) : null}
            {Array.isArray(gsc.sampleQueries) && gsc.sampleQueries.length > 0 ? (
              <p className="text-white/50">
                Sample live queries: {(gsc.sampleQueries as string[]).join(", ")}
                {typeof gsc.contentGapCount === "number" ? `  ·  ${gsc.contentGapCount} page-2 gaps` : ""}
              </p>
            ) : null}
            {gsc.next ? <p className="text-white/70">→ {String(gsc.next)}</p> : null}
            {gsc.error ? <p className="text-red-400">Error: {String(gsc.error)}</p> : null}
          </div>
        )}
      </div>

      {/* Paste + mine */}
      <div className="bg-navy border border-white/10 rounded-lg p-5 mb-6">
        <label className="block text-white/80 text-sm font-semibold mb-2">
          Paste questions or GSC queries (one per line)
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={"why do i keep failing my funded challenge\nhow to stop revenge trading\nwhat is the london killzone\n..."}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-gold/50 resize-none font-mono"
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={mine}
            disabled={mining || !text.trim()}
            className="bg-gold/90 hover:bg-gold text-navy font-bold text-sm px-4 py-2 rounded-md disabled:opacity-40 transition-colors"
          >
            {mining ? "Mining…" : "Mine → Queue"}
          </button>
          <button
            onClick={generateNext}
            disabled={generating || pending.length === 0}
            className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-4 py-2 rounded-md disabled:opacity-40 transition-colors"
          >
            {generating ? "Generating…" : "Generate next post now"}
          </button>
          {msg && <span className="text-xs text-white/60">{msg}</span>}
        </div>
      </div>

      {/* Pending queue */}
      <h2 className="text-white font-semibold mb-3">
        In queue <span className="text-white/40 text-sm">({pending.length})</span>
      </h2>
      {pending.length === 0 ? (
        <p className="text-white/40 text-sm mb-8">Queue is empty. Paste some questions above to fill it.</p>
      ) : (
        <div className="space-y-2 mb-8">
          {pending.map((q) => (
            <div key={q.id} className="bg-navy border border-white/10 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${PRIORITY_STYLE[q.priority]}`}>
                      {q.priority}
                    </span>
                    <span className="text-[10px] text-white/30 uppercase">{q.source}</span>
                  </div>
                  <h3 className="text-white font-medium text-sm">{q.title}</h3>
                  {q.angle && <p className="text-white/50 text-xs mt-1">{q.angle}</p>}
                  {q.question && <p className="text-white/30 text-xs mt-1">↳ {q.question}</p>}
                </div>
                <button
                  onClick={() => remove(q.id)}
                  className="text-white/30 hover:text-red-400 text-xs flex-shrink-0"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recently used */}
      {used.length > 0 && (
        <>
          <h2 className="text-white font-semibold mb-3">
            Recently published from queue <span className="text-white/40 text-sm">({used.length})</span>
          </h2>
          <div className="space-y-1">
            {used.map((q) => (
              <div key={q.id} className="text-sm text-white/50 flex items-center gap-2">
                <span className="text-green-400">✓</span>
                {q.generatedSlug ? (
                  <a
                    href={`/trading-insights/${q.generatedSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gold truncate"
                  >
                    {q.title}
                  </a>
                ) : (
                  <span className="truncate">{q.title}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
