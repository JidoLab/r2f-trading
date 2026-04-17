"use client";

import { useEffect, useState } from "react";

interface PlatformStatus {
  configured: boolean;
  hasApiKey?: boolean;
  hasPublicationId?: boolean;
  connection?: {
    ok: boolean;
    username?: string;
    publicationId?: string;
    publicationTitle?: string;
    error?: string;
  };
  note?: string;
}

interface StatusResponse {
  platforms: {
    devto: PlatformStatus;
    hashnode: PlatformStatus;
    medium: PlatformStatus;
  };
  recentLog: {
    slug: string;
    syndicatedAt: string;
    canonicalUrl: string;
    mediumImportUrl?: string;
    platforms: { platform: string; success: boolean; url?: string; error?: string }[];
  }[];
}

interface DiscoverResponse {
  ok: boolean;
  publicationId?: string;
  publicationTitle?: string;
  publicationUrl?: string;
  error?: string;
}

export default function SyndicationAdminPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testSlug, setTestSlug] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<StatusResponse["recentLog"][0] | null>(null);
  const [discoverResult, setDiscoverResult] = useState<DiscoverResponse | null>(null);
  const [discovering, setDiscovering] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/syndication");
      const data = await res.json();
      setStatus(data);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function discoverHashnode() {
    setDiscovering(true);
    setDiscoverResult(null);
    try {
      const res = await fetch("/api/admin/syndication?discover=hashnode");
      const data = await res.json();
      setDiscoverResult(data);
    } catch (err) {
      setDiscoverResult({ ok: false, error: String(err) });
    }
    setDiscovering(false);
  }

  async function manualSyndicate() {
    if (!testSlug) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/syndication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: testSlug }),
      });
      const data = await res.json();
      setTestResult(data);
      // Refresh log
      load();
    } catch (err) {
      alert(`Error: ${err}`);
    }
    setTesting(false);
  }

  if (loading) return <div className="text-white/40">Loading syndication status...</div>;
  if (!status) return <div className="text-red-400">Failed to load</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Syndication</h1>
        <p className="text-white/40 text-sm mt-1">
          Auto-publishes every blog post to Dev.to, Hashnode, and generates a Medium import link. Each syndicated post
          includes a canonical link back to R2F — SEO-safe, no duplicate content penalty. Every post = 3+ new backlinks.
        </p>
      </div>

      {/* Platform status cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Dev.to */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Dev.to</h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                status.platforms.devto.connection?.ok
                  ? "bg-green-500/20 text-green-400"
                  : status.platforms.devto.configured
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {status.platforms.devto.connection?.ok
                ? "Connected"
                : status.platforms.devto.configured
                ? "Config'd / No Conn"
                : "Not Configured"}
            </span>
          </div>
          {status.platforms.devto.connection?.ok ? (
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-white/40">Username</span>
                <span className="text-white">@{status.platforms.devto.connection.username}</span>
              </div>
            </div>
          ) : status.platforms.devto.connection?.error ? (
            <p className="text-xs text-red-400/80 font-mono break-all">
              {status.platforms.devto.connection.error}
            </p>
          ) : (
            <p className="text-xs text-white/50">
              Set <code className="text-gold">DEVTO_API_KEY</code> on Vercel.
            </p>
          )}
        </div>

        {/* Hashnode */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Hashnode</h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                status.platforms.hashnode.connection?.ok
                  ? "bg-green-500/20 text-green-400"
                  : status.platforms.hashnode.configured
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {status.platforms.hashnode.connection?.ok
                ? "Connected"
                : status.platforms.hashnode.configured
                ? "Config'd / No Conn"
                : "Not Configured"}
            </span>
          </div>
          {status.platforms.hashnode.connection?.ok ? (
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-white/40">Username</span>
                <span className="text-white">@{status.platforms.hashnode.connection.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Publication</span>
                <span className="text-white">{status.platforms.hashnode.connection.publicationTitle}</span>
              </div>
            </div>
          ) : status.platforms.hashnode.connection?.error ? (
            <p className="text-xs text-red-400/80 font-mono break-all">
              {status.platforms.hashnode.connection.error}
            </p>
          ) : (
            <div className="text-xs text-white/50 space-y-2">
              <p>
                Set <code className="text-gold">HASHNODE_API_KEY</code> + <code className="text-gold">HASHNODE_PUBLICATION_ID</code>.
              </p>
              {status.platforms.hashnode.hasApiKey && !status.platforms.hashnode.hasPublicationId && (
                <button
                  onClick={discoverHashnode}
                  disabled={discovering}
                  className="bg-gold hover:bg-gold-light text-navy font-bold text-xs px-3 py-1 rounded disabled:opacity-50"
                >
                  {discovering ? "Discovering..." : "Discover Publication ID →"}
                </button>
              )}
              {discoverResult && discoverResult.ok && (
                <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-green-400">
                  Publication ID: <code className="font-mono">{discoverResult.publicationId}</code>
                  <p className="mt-1 text-white/60">Copy this into Vercel env as HASHNODE_PUBLICATION_ID, then redeploy.</p>
                </div>
              )}
              {discoverResult && !discoverResult.ok && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 font-mono break-all">
                  {discoverResult.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Medium */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Medium</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400">
              Manual Import
            </span>
          </div>
          <p className="text-xs text-white/50">
            Medium has no API. Every blog post sends a one-click import URL to Telegram. Paste into{" "}
            <a
              href="https://medium.com/p/import"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              medium.com/p/import
            </a>{" "}
            → creates a draft with canonical link.
          </p>
        </div>
      </div>

      {/* Setup instructions (shown only if not all configured) */}
      {(!status.platforms.devto.connection?.ok || !status.platforms.hashnode.connection?.ok) && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold mb-4">Setup</h2>
          <div className="space-y-6 text-sm">
            {!status.platforms.devto.connection?.ok && (
              <div>
                <h3 className="text-gold font-bold mb-2">Dev.to (2 min)</h3>
                <ol className="list-decimal pl-5 space-y-1 text-white/70">
                  <li>
                    Sign up at{" "}
                    <a href="https://dev.to/enter" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                      dev.to/enter
                    </a>{" "}
                    (free, GitHub login works).
                  </li>
                  <li>
                    Go to{" "}
                    <a
                      href="https://dev.to/settings/extensions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:underline"
                    >
                      Settings → Extensions
                    </a>
                    .
                  </li>
                  <li>Scroll to <strong>DEV Community API Keys</strong> at bottom.</li>
                  <li>Name: "R2F Syndication" → click Generate API Key.</li>
                  <li>
                    Add to Vercel env: <code className="text-gold">DEVTO_API_KEY=&lt;paste&gt;</code> → redeploy.
                  </li>
                </ol>
              </div>
            )}

            {!status.platforms.hashnode.connection?.ok && (
              <div>
                <h3 className="text-gold font-bold mb-2">Hashnode (5 min)</h3>
                <ol className="list-decimal pl-5 space-y-1 text-white/70">
                  <li>
                    Sign up at{" "}
                    <a href="https://hashnode.com/signup" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                      hashnode.com/signup
                    </a>
                    . Create a publication (e.g., <code>r2ftrading.hashnode.dev</code>).
                  </li>
                  <li>
                    Go to{" "}
                    <a
                      href="https://hashnode.com/settings/developer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:underline"
                    >
                      Settings → Developer
                    </a>{" "}
                    → Generate Personal Access Token.
                  </li>
                  <li>
                    Add to Vercel env: <code className="text-gold">HASHNODE_API_KEY=&lt;paste&gt;</code> → redeploy.
                  </li>
                  <li>After redeploy, come back here and click <strong>"Discover Publication ID"</strong> above.</li>
                  <li>
                    Add to Vercel env: <code className="text-gold">HASHNODE_PUBLICATION_ID=&lt;from discover&gt;</code> → redeploy again.
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual syndication test */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-white font-semibold mb-2">Manually Syndicate Existing Post</h2>
        <p className="text-white/40 text-xs mb-4">
          Paste a blog slug to syndicate it now. Will post to any configured platforms and generate Medium import link.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={testSlug}
            onChange={(e) => setTestSlug(e.target.value)}
            placeholder="blog-post-slug"
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-gold"
          />
          <button
            onClick={manualSyndicate}
            disabled={!testSlug || testing}
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-5 py-2 rounded disabled:opacity-50"
          >
            {testing ? "Syndicating..." : "Syndicate"}
          </button>
        </div>

        {testResult && (
          <div className="mt-4 space-y-2">
            {testResult.platforms.map((p, i) => (
              <div
                key={i}
                className={`p-3 rounded text-sm ${
                  p.success ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                <div className="flex justify-between items-start">
                  <strong className="capitalize text-white">{p.platform}</strong>
                  <span className={p.success ? "text-green-400" : "text-red-400"}>
                    {p.success ? "✓" : "✗"}
                  </span>
                </div>
                {p.url && (
                  <a
                    href={p.platform === "medium" && testResult.mediumImportUrl
                      ? `${p.url}?url=${encodeURIComponent(testResult.mediumImportUrl)}`
                      : p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold hover:underline text-xs break-all block mt-1"
                  >
                    {p.platform === "medium" ? "Click to import into Medium →" : `${p.url} →`}
                  </a>
                )}
                {p.error && <p className="text-red-400 text-xs font-mono mt-1">{p.error}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent syndication log */}
      {status.recentLog.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold mb-4">Recent Syndications</h2>
          <div className="space-y-3">
            {status.recentLog.map((entry, i) => (
              <div key={i} className="border-b border-white/5 pb-3 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white text-sm font-mono">{entry.slug}</p>
                    <p className="text-white/30 text-xs">{new Date(entry.syndicatedAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {entry.platforms.map((p, j) => (
                    <span
                      key={j}
                      className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        p.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {p.success ? "✓" : "✗"} {p.platform}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
