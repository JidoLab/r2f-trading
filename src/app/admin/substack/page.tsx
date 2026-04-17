"use client";

import { useEffect, useState } from "react";

interface StatusInfo {
  configured: boolean;
  hasSessionCookie?: boolean;
  hasPublicationUrl?: boolean;
  hasUserId?: boolean;
  publicationUrl?: string;
  userId?: string;
  connection?: {
    ok: boolean;
    userId?: number;
    name?: string;
    email?: string;
    error?: string;
  };
  setupInstructions?: Record<string, string>;
}

interface DraftResult {
  success: boolean;
  draftId?: string;
  draftUrl?: string;
  error?: string;
}

export default function SubstackAdminPage() {
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [testSlug, setTestSlug] = useState("");
  const [testResult, setTestResult] = useState<DraftResult | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/substack")
      .then((r) => r.json())
      .then((d) => {
        setStatus(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function testDraft() {
    if (!testSlug) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/substack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: testSlug }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, error: String(err) });
    }
    setTesting(false);
  }

  if (loading) {
    return <div className="text-white/40">Loading Substack status...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Substack Integration</h1>
        <p className="text-white/40 text-sm mt-1">
          Auto-creates Substack drafts for every blog post. You review and publish manually.
        </p>
      </div>

      {/* Status card */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Connection Status</h2>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              status?.configured && status?.connection?.ok
                ? "bg-green-500/20 text-green-400"
                : status?.configured
                ? "bg-amber-500/20 text-amber-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {status?.configured && status?.connection?.ok
              ? "Connected"
              : status?.configured
              ? "Configured (Connection Failed)"
              : "Not Configured"}
          </span>
        </div>

        {status?.configured ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Publication URL</span>
              <span className="text-white font-mono">{status.publicationUrl}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">User ID</span>
              <span className="text-white font-mono">{status.userId}</span>
            </div>
            {status.connection?.ok && (
              <>
                <div className="flex justify-between">
                  <span className="text-white/50">Account Name</span>
                  <span className="text-white">{status.connection.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Email</span>
                  <span className="text-white">{status.connection.email}</span>
                </div>
              </>
            )}
            {status.connection && !status.connection.ok && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded">
                <p className="text-red-400 text-xs font-mono">{status.connection.error}</p>
                <p className="text-white/50 text-xs mt-2">
                  Session cookie may have expired. Re-extract from browser and update{" "}
                  <code className="text-gold">SUBSTACK_SESSION_COOKIE</code> on Vercel.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div
                className={`p-3 rounded border ${
                  status?.hasSessionCookie
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}
              >
                {status?.hasSessionCookie ? "✓" : "✗"} SESSION_COOKIE
              </div>
              <div
                className={`p-3 rounded border ${
                  status?.hasPublicationUrl
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}
              >
                {status?.hasPublicationUrl ? "✓" : "✗"} PUBLICATION_URL
              </div>
              <div
                className={`p-3 rounded border ${
                  status?.hasUserId
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}
              >
                {status?.hasUserId ? "✓" : "✗"} USER_ID
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Setup instructions */}
      {!status?.configured && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold mb-4">Setup Instructions</h2>
          <ol className="list-decimal pl-5 space-y-3 text-sm text-white/70">
            <li>
              Create a Substack publication at{" "}
              <a
                href="https://substack.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline"
              >
                substack.com/signup
              </a>{" "}
              (if you haven&apos;t already).
            </li>
            <li>
              Log in to Substack in Chrome. Open DevTools (F12) → <strong>Application</strong> tab →{" "}
              <strong>Cookies</strong> → <code className="text-gold">https://substack.com</code>.
            </li>
            <li>
              Find the cookie named <code className="text-gold">substack.sid</code> and copy its{" "}
              <strong>Value</strong>.
            </li>
            <li>
              Add these env vars on Vercel and redeploy:
              <div className="mt-2 bg-black/40 rounded p-3 font-mono text-xs space-y-1">
                <div className="text-white/50">SUBSTACK_SESSION_COOKIE=<span className="text-gold">&lt;paste cookie value&gt;</span></div>
                <div className="text-white/50">SUBSTACK_PUBLICATION_URL=<span className="text-gold">https://yourpub.substack.com</span></div>
                <div className="text-white/50">SUBSTACK_USER_ID=<span className="text-gold">&lt;your numeric user ID&gt;</span></div>
              </div>
            </li>
            <li>
              To find your User ID: log into Substack, go to your profile page. The URL will be{" "}
              <code className="text-gold">substack.com/@username</code>. Open DevTools → Network tab, refresh, and look for an API call
              that returns your profile. Your numeric ID is in the response.
            </li>
            <li>
              Once configured, every new blog post will automatically create a Substack draft. You review + publish manually
              on Substack (safer than auto-publish).
            </li>
          </ol>
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300">
            <strong>Note:</strong> Substack has no official publishing API. This uses reverse-engineered endpoints with
            cookie authentication. If Substack changes their internal API, this may break. Drafts always fall back gracefully
            — they never block blog generation.
          </div>
        </div>
      )}

      {/* Manual test */}
      {status?.configured && status?.connection?.ok && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold mb-2">Create Draft From Existing Post</h2>
          <p className="text-white/40 text-xs mb-4">
            Paste a blog post slug (e.g., <code>2026-04-17-why-you-freeze-before-pulling-the-trigger</code>) to manually
            create a Substack draft from it.
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
              onClick={testDraft}
              disabled={!testSlug || testing}
              className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-5 py-2 rounded disabled:opacity-50"
            >
              {testing ? "Creating..." : "Create Draft"}
            </button>
          </div>
          {testResult && (
            <div
              className={`mt-4 p-3 rounded text-sm ${
                testResult.success
                  ? "bg-green-500/10 border border-green-500/20 text-green-300"
                  : "bg-red-500/10 border border-red-500/20 text-red-300"
              }`}
            >
              {testResult.success ? (
                <>
                  <p className="font-semibold mb-1">Draft created successfully.</p>
                  <a
                    href={testResult.draftUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold hover:underline text-xs break-all"
                  >
                    {testResult.draftUrl} →
                  </a>
                </>
              ) : (
                <p className="font-mono text-xs">{testResult.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-white font-semibold mb-3">How It Works</h2>
        <ul className="text-sm text-white/60 space-y-2">
          <li>
            • Every new blog post automatically creates a Substack <strong className="text-white">draft</strong>.
          </li>
          <li>
            • Drafts include a canonical link back to r2ftrading.com (SEO-safe, no duplicate content penalty).
          </li>
          <li>
            • You get a Telegram alert with the draft URL. Review + publish manually on Substack.
          </li>
          <li>
            • Cover image is set automatically if available.
          </li>
          <li>
            • Failures are silent (they never block blog generation). Check Vercel logs if drafts aren&apos;t appearing.
          </li>
        </ul>
      </div>
    </div>
  );
}
