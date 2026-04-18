"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MusicMood = "hype" | "chill" | "cinematic" | "suspense" | "uplift";

interface Track {
  id: string;
  url: string;
  name: string;
  mood: MusicMood;
  enabled: boolean;
  addedAt: string;
  usageCount: number;
  lastUsedAt?: string;
}

interface Library {
  tracks: Track[];
  enabled: boolean;
  baseVolumeDb: number;
  duckRatio: number;
}

const MOODS: MusicMood[] = ["hype", "chill", "cinematic", "suspense", "uplift"];

export default function MusicLibraryPage() {
  const [lib, setLib] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Add form state
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [mood, setMood] = useState<MusicMood>("chill");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shorts/music-library");
      if (res.ok) setLib(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function post(body: Record<string, unknown>, successMsg?: string) {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/shorts/music-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${d.error || "Failed"}`);
      } else {
        if (d.library) setLib(d.library);
        if (successMsg) setMessage(`✅ ${successMsg}`);
      }
    } catch (e) {
      setMessage(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
    setSaving(false);
  }

  async function addTrack() {
    if (!url.trim() || !name.trim()) {
      setMessage("❌ URL and name required");
      return;
    }
    await post({ action: "add", url, name, mood }, `Added "${name}"`);
    setUrl("");
    setName("");
  }

  return (
    <main className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/shorts"
          className="text-xs font-bold tracking-[0.2em] uppercase text-navy/60 hover:text-gold"
        >
          ← Shorts Pipeline
        </Link>
        <h1 className="text-3xl font-bold text-navy mt-2">Background Music Library</h1>
        <p className="text-gray-500 text-sm mt-1">
          Optional subtle music under shorts. Voice always ducks music automatically.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-md border p-4 text-sm ${
            message.startsWith("✅")
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      {/* Quick Start Guide (collapsible-feeling but always on for first-run clarity) */}
      {lib && lib.tracks.length === 0 && (
        <div className="mb-6 rounded-lg border border-gold/40 bg-gold/5 p-5">
          <p className="text-navy font-bold text-sm mb-2">How to add your first tracks (~5 min)</p>
          <ol className="text-sm text-gray-700 space-y-1.5 list-decimal list-inside">
            <li>
              Go to{" "}
              <a href="https://pixabay.com/music/search/cinematic/" target="_blank" rel="noopener noreferrer" className="text-gold underline">
                Pixabay&rsquo;s music search
              </a>{" "}
              (cinematic, hype, chill — their license allows commercial use, no attribution required)
            </li>
            <li>Click a track to open it, then right-click the <strong>Download</strong> button → <strong>Copy link address</strong></li>
            <li>
              Paste the link below. The URL looks like{" "}
              <code className="bg-white px-1.5 py-0.5 rounded text-xs">https://cdn.pixabay.com/audio/...</code>
            </li>
            <li>Tag it with a mood. Add 3&ndash;5 tracks for variety.</li>
          </ol>
        </div>
      )}

      {/* Master switch + tuning */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-navy text-white rounded-lg p-5">
          <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Music Enabled</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black">{lib?.enabled ? "ON" : "OFF"}</span>
            <button
              disabled={saving || !lib}
              onClick={() => post({ action: "toggle-library", enabled: !lib?.enabled })}
              className="bg-gold text-navy text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded hover:bg-gold-light disabled:opacity-40"
            >
              Toggle
            </button>
          </div>
          <p className="text-white/50 text-xs mt-2">Master switch. Shorts render without music when off.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Base Volume</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={-30}
              max={-6}
              step={1}
              value={lib?.baseVolumeDb ?? -18}
              onChange={(e) => lib && setLib({ ...lib, baseVolumeDb: parseInt(e.target.value, 10) })}
              onMouseUp={() => post({ action: "update-settings", baseVolumeDb: lib?.baseVolumeDb })}
              className="flex-1"
            />
            <span className="font-mono text-lg text-navy font-black w-20 text-right">
              {lib?.baseVolumeDb ?? -18} dB
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-2">Subtle: -18 to -22 dB. Bolder: -12 to -15 dB.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Duck Ratio</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={2}
              max={16}
              step={1}
              value={lib?.duckRatio ?? 8}
              onChange={(e) => lib && setLib({ ...lib, duckRatio: parseInt(e.target.value, 10) })}
              onMouseUp={() => post({ action: "update-settings", duckRatio: lib?.duckRatio })}
              className="flex-1"
            />
            <span className="font-mono text-lg text-navy font-black w-20 text-right">
              {lib?.duckRatio ?? 8}:1
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-2">How hard music drops under voice. 8:1 is a safe default.</p>
        </div>
      </div>

      {/* Add track form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-8">
        <p className="text-navy font-bold text-sm mb-3">Add Track</p>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            type="url"
            placeholder="https://cdn.pixabay.com/audio/.../track.mp3"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="md:col-span-6 border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Track name (e.g. 'Epic Buildup')"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="md:col-span-3 border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <select
            value={mood}
            onChange={(e) => setMood(e.target.value as MusicMood)}
            className="md:col-span-2 border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {MOODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            onClick={addTrack}
            disabled={saving}
            className="md:col-span-1 bg-gold hover:bg-gold-light text-navy font-bold text-xs uppercase tracking-wider rounded disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      {/* Track list */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Tracks ({lib?.tracks.length ?? 0})
          </span>
          <span className="text-xs text-gray-400">
            {lib?.tracks.filter((t) => t.enabled).length ?? 0} enabled
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : !lib || lib.tracks.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No tracks yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2 w-12">On</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Mood</th>
                <th className="px-4 py-2">Preview</th>
                <th className="px-4 py-2 text-right">Used</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {lib.tracks.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => post({ action: "toggle-track", id: t.id })}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        t.enabled ? "bg-gold" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                          t.enabled ? "translate-x-[22px]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-navy">{t.name}</p>
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-gold truncate max-w-sm inline-block align-bottom"
                    >
                      {t.url}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-navy/5 text-navy font-mono uppercase tracking-wider px-2 py-0.5 rounded">
                      {t.mood}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <audio src={t.url} controls preload="none" className="h-8" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">
                    {t.usageCount}×
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${t.name}"?`)) post({ action: "delete", id: t.id });
                      }}
                      className="text-red-600 hover:text-red-800 text-xs font-bold uppercase tracking-wider"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
