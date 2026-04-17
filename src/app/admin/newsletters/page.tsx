"use client";

import { useEffect, useState } from "react";

interface NewsletterRecord {
  date: string;
  sentAt: string;
  subject: string;
  recipientCount: number;
  failedCount: number;
  totalSubscribers: number;
  content: {
    greeting: string;
    marketRecap: string;
    articles: { title: string; slug: string; excerpt: string }[];
    videoOfTheWeek?: { title: string; url: string };
    tipOfTheWeek: string;
    comingUp: string;
    ctaText: string;
    ctaUrl: string;
  };
}

export default function AdminNewslettersPage() {
  const [newsletters, setNewsletters] = useState<NewsletterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  function loadNewsletters() {
    setLoading(true);
    fetch("/api/admin/newsletters")
      .then((r) => r.json())
      .then((data) => {
        setNewsletters(data.newsletters || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadNewsletters();
  }, []);

  async function handleSendNow() {
    if (!confirm("Send the weekly newsletter now to all subscribers?")) return;
    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/admin/newsletters/send", {
        method: "POST",
      });
      // Defensive: response might be HTML (e.g., Vercel error page, auth redirect)
      const rawText = await res.text();
      let data: { sent?: number; total?: number; subject?: string; error?: string; message?: string } = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        // Not JSON — likely an HTML error page
        setSendResult(
          `Error (HTTP ${res.status}): ${
            rawText.includes("<!doctype") || rawText.includes("<html")
              ? "Server returned HTML instead of JSON. The function may have timed out or crashed. Check Vercel logs."
              : rawText.slice(0, 200)
          }`,
        );
        setSending(false);
        return;
      }

      if (res.ok) {
        if (data.message === "No subscribers") {
          setSendResult("No subscribers in database — nothing to send.");
        } else {
          setSendResult(`Sent to ${data.sent}/${data.total} subscribers. Subject: "${data.subject}"`);
          loadNewsletters();
        }
      } else {
        setSendResult(`Error (HTTP ${res.status}): ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      setSendResult(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setSending(false);
  }

  const totalSent = newsletters.reduce((sum, n) => sum + n.recipientCount, 0);
  const totalNewsletters = newsletters.length;
  const avgRecipients = totalNewsletters > 0 ? Math.round(totalSent / totalNewsletters) : 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <h1 className="text-2xl font-bold text-white">Newsletters</h1>
        <button
          onClick={handleSendNow}
          disabled={sending}
          className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-2.5 rounded-md transition-all disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send Now"}
        </button>
      </div>
      <p className="text-white/50 text-sm mb-8">Weekly digest newsletters sent to subscribers.</p>

      {sendResult && (
        <div className={`mb-6 p-4 rounded-lg text-sm ${sendResult.startsWith("Error") || sendResult.startsWith("Failed") ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-green-500/10 border border-green-500/20 text-green-400"}`}>
          {sendResult}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs mb-1">Total Sent</p>
          <p className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>{totalNewsletters}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs mb-1">Total Recipients</p>
          <p className="text-2xl font-black text-gold" style={{ fontFamily: "var(--font-heading)" }}>{totalSent}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs mb-1">Avg Recipients</p>
          <p className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>{avgRecipients}</p>
        </div>
      </div>

      {/* Newsletter List */}
      {loading ? (
        <p className="text-white/40">Loading...</p>
      ) : newsletters.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
          <p className="text-white/40 mb-2">No newsletters sent yet.</p>
          <p className="text-white/30 text-sm">Click &quot;Send Now&quot; to generate and send your first weekly digest.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {newsletters.map((nl) => (
            <div key={nl.date} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === nl.date ? null : nl.date)}
                className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-white/40 text-xs font-mono shrink-0">
                      {new Date(nl.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-green-500/10 text-green-400 shrink-0">
                      {nl.recipientCount} sent
                    </span>
                    {nl.failedCount > 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/10 text-red-400 shrink-0">
                        {nl.failedCount} failed
                      </span>
                    )}
                  </div>
                  <p className="text-white/90 text-sm font-medium truncate">{nl.subject}</p>
                </div>
                <span className="text-white/30 ml-4 shrink-0">{expanded === nl.date ? "▲" : "▼"}</span>
              </button>

              {expanded === nl.date && (
                <div className="px-6 pb-6 border-t border-white/5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* Market Recap */}
                    <div>
                      <h4 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">This Week in Trading</h4>
                      <p className="text-white/70 text-sm leading-relaxed">{nl.content.marketRecap}</p>
                    </div>

                    {/* Tip of the Week */}
                    <div>
                      <h4 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Tip of the Week</h4>
                      <p className="text-white/70 text-sm leading-relaxed italic">{nl.content.tipOfTheWeek}</p>
                    </div>

                    {/* Articles */}
                    {nl.content.articles.length > 0 && (
                      <div>
                        <h4 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Articles ({nl.content.articles.length})</h4>
                        <ul className="space-y-2">
                          {nl.content.articles.map((a) => (
                            <li key={a.slug}>
                              <a
                                href={`/trading-insights/${a.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gold text-sm hover:underline"
                              >
                                {a.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Video */}
                    {nl.content.videoOfTheWeek && (
                      <div>
                        <h4 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Video of the Week</h4>
                        <a
                          href={nl.content.videoOfTheWeek.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold text-sm hover:underline"
                        >
                          {nl.content.videoOfTheWeek.title}
                        </a>
                      </div>
                    )}

                    {/* Coming Up */}
                    <div className="md:col-span-2">
                      <h4 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Coming Up</h4>
                      <p className="text-white/70 text-sm leading-relaxed">{nl.content.comingUp}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-4 text-xs text-white/30">
                    <span>CTA: {nl.content.ctaText}</span>
                    <span>|</span>
                    <span>Total subs at time: {nl.totalSubscribers}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
