"use client";

import { useEffect, useState } from "react";

type OutreachStatus =
  | "untouched"
  | "researched"
  | "drafted"
  | "pitched"
  | "replied"
  | "accepted"
  | "rejected";

interface PitchTopic {
  title: string;
  angle: string;
}

interface OutreachTarget {
  id: string;
  name: string;
  url: string;
  contactEmail?: string;
  guestPostUrl?: string;
  domainRating?: "low" | "medium" | "high" | "low-medium" | "medium-high";
  topics?: string[];
  status: OutreachStatus;
  context?: {
    blogTitle?: string;
    blogDescription?: string;
    recentPosts?: string[];
    scrapedAt?: string;
    scrapeError?: string;
  };
  pitch?: {
    subject: string;
    body: string;
    topics: PitchTopic[];
    draftedAt: string;
  };
  pitchedAt?: string;
  repliedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface StatusResponse {
  targets: OutreachTarget[];
  byStatus: Record<OutreachStatus, OutreachTarget[]>;
  totals: { all: number; active: number; inFlight: number; won: number; lost: number };
}

const STATUS_LABELS: Record<OutreachStatus, string> = {
  untouched: "Untouched",
  researched: "Researched",
  drafted: "Drafted",
  pitched: "Pitched",
  replied: "Replied",
  accepted: "Accepted",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<OutreachStatus, string> = {
  untouched: "bg-white/10 text-white/60",
  researched: "bg-blue-500/20 text-blue-300",
  drafted: "bg-purple-500/20 text-purple-300",
  pitched: "bg-amber-500/20 text-amber-300",
  replied: "bg-cyan-500/20 text-cyan-300",
  accepted: "bg-green-500/20 text-green-300",
  rejected: "bg-red-500/20 text-red-300",
};

export default function OutreachAdminPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    url: "",
    contactEmail: "",
    guestPostUrl: "",
    domainRating: "" as OutreachTarget["domainRating"] | "",
    topics: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/outreach");
      const json = await res.json();
      setData(json);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function addTarget() {
    if (!addForm.name || !addForm.url) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name,
          url: addForm.url,
          contactEmail: addForm.contactEmail || undefined,
          guestPostUrl: addForm.guestPostUrl || undefined,
          domainRating: addForm.domainRating || undefined,
          topics: addForm.topics
            ? addForm.topics.split(",").map((t) => t.trim()).filter(Boolean)
            : undefined,
        }),
      });
      if (res.ok) {
        setAddForm({
          name: "",
          url: "",
          contactEmail: "",
          guestPostUrl: "",
          domainRating: "",
          topics: "",
        });
        setShowAddForm(false);
        load();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "Failed"}`);
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
    setAddLoading(false);
  }

  async function seedStarters() {
    if (!confirm("Load 15 curated starter trading blogs? Skips any already added.")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/outreach/seed", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || `Added ${json.added} new targets`);
        load();
      } else {
        alert(`Error: ${json.error}`);
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
    setSeeding(false);
  }

  async function generateDraft(id: string) {
    setDrafting(id);
    try {
      const res = await fetch(`/api/admin/outreach/${id}/draft`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setSelectedId(id);
        load();
      } else {
        alert(`Error: ${json.error || "Failed"}`);
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
    setDrafting(null);
  }

  async function updateStatus(id: string, status: OutreachStatus) {
    try {
      await fetch(`/api/admin/outreach/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      load();
    } catch {
      // ignore
    }
  }

  async function deleteTarget(id: string) {
    if (!confirm("Delete this target? Cannot be undone.")) return;
    try {
      await fetch(`/api/admin/outreach/${id}`, { method: "DELETE" });
      if (selectedId === id) setSelectedId(null);
      load();
    } catch {
      // ignore
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function buildGmailUrl(to: string, subject: string, body: string) {
    const params = new URLSearchParams({ fs: "1", tf: "cm", to, su: subject, body });
    return `https://mail.google.com/mail/u/0/?${params.toString()}`;
  }

  if (loading) return <div className="text-white/40">Loading outreach pipeline...</div>;
  if (!data) return <div className="text-red-400">Failed to load</div>;

  const selected = selectedId ? data.targets.find((t) => t.id === selectedId) : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white">Guest Post Outreach</h1>
          <p className="text-white/40 text-sm mt-1">
            Pitch trading blogs for guest post opportunities. Each accepted post = a high-value
            backlink that boosts Google crawl budget and authority.
          </p>
        </div>
        <div className="flex gap-2">
          {data.totals.all === 0 && (
            <button
              onClick={seedStarters}
              disabled={seeding}
              className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
            >
              {seeding ? "Loading..." : "Load 15 Starters"}
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-4 py-2 rounded"
          >
            {showAddForm ? "Cancel" : "+ Add Target"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {(
          [
            ["Total", data.totals.all, "text-white"],
            ["Active", data.totals.active, "text-blue-300"],
            ["In Flight", data.totals.inFlight, "text-amber-300"],
            ["Won", data.totals.won, "text-green-400"],
            ["Lost", data.totals.lost, "text-red-400"],
          ] as const
        ).map(([label, value, cls]) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="text-white/40 text-[10px] uppercase tracking-wider">{label}</div>
            <div className={`text-2xl font-bold ${cls}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
          <h3 className="text-white font-semibold">Add Target Blog</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
              placeholder="Blog name (e.g. Forex Crunch)"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            />
            <input
              className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
              placeholder="https://..."
              value={addForm.url}
              onChange={(e) => setAddForm({ ...addForm, url: e.target.value })}
            />
            <input
              className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
              placeholder="Contact email (optional)"
              value={addForm.contactEmail}
              onChange={(e) => setAddForm({ ...addForm, contactEmail: e.target.value })}
            />
            <input
              className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
              placeholder="Guest post page URL (optional)"
              value={addForm.guestPostUrl}
              onChange={(e) => setAddForm({ ...addForm, guestPostUrl: e.target.value })}
            />
            <select
              className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
              value={addForm.domainRating || ""}
              onChange={(e) =>
                setAddForm({
                  ...addForm,
                  domainRating: (e.target.value || undefined) as OutreachTarget["domainRating"],
                })
              }
            >
              <option value="">Domain rating</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
              placeholder="Topics (comma-separated, e.g. forex, psychology)"
              value={addForm.topics}
              onChange={(e) => setAddForm({ ...addForm, topics: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={addTarget}
              disabled={!addForm.name || !addForm.url || addLoading}
              className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-4 py-2 rounded disabled:opacity-50"
            >
              {addLoading ? "Adding + scraping..." : "Add Target"}
            </button>
          </div>
        </div>
      )}

      {/* Pipeline */}
      {data.totals.all === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
          <p className="text-white/50 mb-4">No targets yet.</p>
          <p className="text-white/30 text-sm">
            Click <strong>"Load 15 Starters"</strong> to seed curated trading blogs, or{" "}
            <strong>"+ Add Target"</strong> to add your own.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left: target list by status */}
          <div className="lg:col-span-1 space-y-4 lg:max-h-[80vh] overflow-y-auto lg:sticky lg:top-0">
            {(Object.keys(data.byStatus) as OutreachStatus[])
              .filter((s) => data.byStatus[s].length > 0)
              .map((status) => (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="text-white/30 text-xs">{data.byStatus[status].length}</span>
                  </div>
                  <div className="space-y-1">
                    {data.byStatus[status].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedId(t.id)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedId === t.id
                            ? "bg-gold/20 border border-gold/40 text-white"
                            : "bg-white/5 hover:bg-white/10 text-white/70"
                        }`}
                      >
                        <div className="font-semibold truncate">{t.name}</div>
                        <div className="text-[10px] text-white/40 truncate">{t.url}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          {/* Right: target detail */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center text-white/40">
                Select a target on the left to view/draft pitches
              </div>
            ) : (
              <TargetDetail
                target={selected}
                drafting={drafting === selected.id}
                onDraft={() => generateDraft(selected.id)}
                onStatus={(s) => updateStatus(selected.id, s)}
                onDelete={() => deleteTarget(selected.id)}
                onCopy={copyToClipboard}
                buildGmailUrl={buildGmailUrl}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TargetDetail({
  target,
  drafting,
  onDraft,
  onStatus,
  onDelete,
  onCopy,
  buildGmailUrl,
}: {
  target: OutreachTarget;
  drafting: boolean;
  onDraft: () => void;
  onStatus: (s: OutreachStatus) => void;
  onDelete: () => void;
  onCopy: (text: string) => void;
  buildGmailUrl: (to: string, subject: string, body: string) => string;
}) {
  const gmailUrl =
    target.pitch && target.contactEmail
      ? buildGmailUrl(target.contactEmail, target.pitch.subject, target.pitch.body)
      : null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-white">{target.name}</h2>
          <a
            href={target.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline text-sm break-all"
          >
            {target.url} →
          </a>
          {target.contactEmail && (
            <div className="text-sm text-white/50 mt-1">📧 {target.contactEmail}</div>
          )}
          {target.guestPostUrl && (
            <div className="text-sm mt-1">
              <a
                href={target.guestPostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/50 hover:text-white underline"
              >
                Guest post page →
              </a>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[target.status]}`}>
            {STATUS_LABELS[target.status]}
          </span>
          <select
            className="text-xs bg-white/10 border border-white/20 rounded text-white px-2 py-1"
            value={target.status}
            onChange={(e) => onStatus(e.target.value as OutreachStatus)}
          >
            {(Object.keys(STATUS_LABELS) as OutreachStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Context */}
      {target.context && (
        <div className="bg-black/30 border border-white/5 rounded p-3 text-xs space-y-2">
          <div className="text-white/40 uppercase tracking-wider text-[9px]">Scraped Context</div>
          {target.context.scrapeError ? (
            <div className="text-red-400/80 font-mono">Scrape failed: {target.context.scrapeError}</div>
          ) : (
            <>
              {target.context.blogTitle && (
                <div>
                  <span className="text-white/40">Title:</span>{" "}
                  <span className="text-white">{target.context.blogTitle}</span>
                </div>
              )}
              {target.context.blogDescription && (
                <div>
                  <span className="text-white/40">Description:</span>{" "}
                  <span className="text-white/80">{target.context.blogDescription}</span>
                </div>
              )}
              {target.context.recentPosts && target.context.recentPosts.length > 0 && (
                <div>
                  <div className="text-white/40">Recent posts:</div>
                  <ul className="pl-4 list-disc text-white/70">
                    {target.context.recentPosts.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Pitch */}
      {target.pitch ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-semibold">Pitch Draft</h3>
            <div className="flex gap-2">
              <button
                onClick={onDraft}
                disabled={drafting}
                className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded disabled:opacity-50"
              >
                {drafting ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
          </div>

          {/* Topics */}
          <div>
            <div className="text-white/40 uppercase tracking-wider text-[9px] mb-1">3 Topic Ideas</div>
            <div className="space-y-2">
              {target.pitch.topics.map((t, i) => (
                <div key={i} className="bg-black/30 border border-white/5 rounded p-2 text-sm">
                  <div className="text-white font-medium">{t.title}</div>
                  <div className="text-white/50 text-xs mt-1">{t.angle}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-white/40 uppercase tracking-wider text-[9px]">Subject</div>
              <button
                onClick={() => onCopy(target.pitch!.subject)}
                className="text-[9px] text-gold hover:underline"
              >
                copy
              </button>
            </div>
            <div className="bg-black/30 border border-white/5 rounded p-2 text-sm text-white font-mono">
              {target.pitch.subject}
            </div>
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-white/40 uppercase tracking-wider text-[9px]">Email Body</div>
              <button
                onClick={() => onCopy(target.pitch!.body)}
                className="text-[9px] text-gold hover:underline"
              >
                copy
              </button>
            </div>
            <pre className="bg-black/30 border border-white/5 rounded p-3 text-sm text-white/90 whitespace-pre-wrap font-sans">
              {target.pitch.body}
            </pre>
          </div>

          {/* Send buttons */}
          <div className="flex gap-2 pt-2">
            {gmailUrl ? (
              <a
                href={gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-4 py-2 rounded"
              >
                Open in Gmail →
              </a>
            ) : (
              <div className="text-amber-300 text-xs">
                Add contact email (Edit section) to enable Gmail send
              </div>
            )}
            <button
              onClick={() => onCopy(target.pitch!.body)}
              className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded"
            >
              Copy Body
            </button>
            {target.status !== "pitched" && target.status !== "replied" && (
              <button
                onClick={() => onStatus("pitched")}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm px-4 py-2 rounded"
              >
                Mark as Pitched →
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-white/10 rounded p-6 text-center">
          <p className="text-white/50 mb-3">No pitch drafted yet.</p>
          <button
            onClick={onDraft}
            disabled={drafting}
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-5 py-2 rounded disabled:opacity-50"
          >
            {drafting ? "Drafting with Claude..." : "Draft Pitch"}
          </button>
        </div>
      )}

      {/* Danger zone */}
      <div className="pt-3 border-t border-white/5">
        <button onClick={onDelete} className="text-xs text-red-400/60 hover:text-red-400">
          Delete target
        </button>
      </div>
    </div>
  );
}
