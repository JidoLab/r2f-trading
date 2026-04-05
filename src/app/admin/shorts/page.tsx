"use client";

import { useState } from "react";

export default function AdminShortsPage() {
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState<{
    title: string;
    script: string;
    hookLine: string;
    ctaLine: string;
    textOverlays: { timestamp: string; text: string; style: string }[];
    estimatedDuration: number;
  } | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/shorts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setScript(data.script);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed: ${err.error || "Unknown error"}`);
      }
    } catch {
      alert("Generation failed");
    }
    setGenerating(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">YouTube Shorts</h1>
      <p className="text-white/50 text-sm mb-8">
        Generate scripts, record voiceovers, and assemble professional Shorts.
      </p>

      {/* Generate Script */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4">Step 1: Generate Script</h2>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic (optional — AI picks one if blank)"
            className="flex-1 px-4 py-2.5 rounded-md bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold"
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-2.5 rounded-md transition-all disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Script"}
          </button>
        </div>
      </div>

      {/* Script Result */}
      {script && (
        <>
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
            <h2 className="text-white font-semibold text-sm mb-1">📝 Script: {script.title}</h2>
            <p className="text-white/30 text-xs mb-4">~{script.estimatedDuration} seconds</p>

            <div className="bg-[#0d1825] rounded-lg p-5 mb-4">
              <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">{script.script}</p>
            </div>

            <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Text Overlays</h3>
            <div className="space-y-1 mb-4">
              {script.textOverlays.map((o, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="text-white/30 w-10">[{o.timestamp}]</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    o.style === "hook" ? "bg-red-500/20 text-red-400" :
                    o.style === "cta" ? "bg-gold/20 text-gold" :
                    o.style === "stat" ? "bg-blue-500/20 text-blue-400" :
                    "bg-white/10 text-white/60"
                  }`}>{o.style}</span>
                  <span className="text-white/80">{o.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
            <h2 className="text-white font-semibold text-sm mb-4">Step 2: Record Voiceover</h2>
            <div className="text-white/60 text-sm space-y-2">
              <p>1. Read the script aloud on your phone or computer (30-45 seconds)</p>
              <p>2. Save the recording as <code className="bg-white/10 px-1.5 py-0.5 rounded text-gold text-xs">voiceover.mp3</code></p>
              <p>3. Place it in: <code className="bg-white/10 px-1.5 py-0.5 rounded text-gold text-xs">scripts/shorts/projects/[slug]/</code></p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
            <h2 className="text-white font-semibold text-sm mb-4">Step 3: Assemble & Upload</h2>
            <div className="text-white/60 text-sm space-y-2">
              <p>Run these commands in your terminal:</p>
              <div className="bg-[#0d1825] rounded-lg p-4 mt-3 space-y-2">
                <p className="text-gold font-mono text-xs">npm run assemble-short &quot;{script.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}&quot;</p>
                <p className="text-white/30 font-mono text-xs"># Preview the video, then:</p>
                <p className="text-gold font-mono text-xs">npm run upload-short &quot;{script.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}&quot;</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Workflow Summary */}
      {!script && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold text-sm mb-4">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Generate Script", desc: "AI writes a 30-45s script with text overlays" },
              { step: "2", title: "Record Voice", desc: "Read the script aloud, save as MP3" },
              { step: "3", title: "Assemble Video", desc: "FFmpeg combines voice + visuals + text" },
              { step: "4", title: "Upload", desc: "One command uploads to YouTube Shorts" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-gold/20 text-gold font-bold text-lg flex items-center justify-center mx-auto mb-2">
                  {s.step}
                </div>
                <p className="text-white text-xs font-semibold">{s.title}</p>
                <p className="text-white/40 text-[11px] mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
