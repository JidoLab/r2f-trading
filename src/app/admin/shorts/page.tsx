"use client";

import { useEffect, useState } from "react";

interface PipelineData {
  calendar: { date: string; topic: string; contentType: string; used: boolean }[];
  seriesTracker: Record<string, number>;
  performance: {
    lastPull: string;
    topVideos: { title: string; views: number }[];
    bottomVideos: { title: string; views: number }[];
    totalVideos: number;
  } | null;
  pendingScripts: string[];
  config: { enabled: boolean };
}

interface VideoEntry {
  slug: string;
  title: string;
  status: string;
  contentType?: string;
  videoUrl?: string;
  youtubeUrl?: string;
  copyText?: string;
  createdAt: string;
  completedAt?: string;
  uploadResults?: { platform: string; status: string }[];
  error?: string;
}

export default function AdminShortsPage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [generatingCal, setGeneratingCal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genCount, setGenCount] = useState(1);
  const [genContentType, setGenContentType] = useState("");
  const [genDuration, setGenDuration] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchData() {
    try {
      const [pRes, vRes] = await Promise.all([
        fetch("/api/admin/shorts/pipeline"),
        fetch("/api/admin/shorts/videos"),
      ]);
      if (pRes.ok) setData(await pRes.json());
      if (vRes.ok) {
        const vData = await vRes.json();
        setVideos(vData.videos || []);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function toggleAutomation() {
    if (!data) return;
    setToggling(true);
    try {
      const res = await fetch("/api/admin/shorts/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !data.config.enabled }),
      });
      if (res.ok) setData({ ...data, config: { enabled: !data.config.enabled } });
    } catch {}
    setToggling(false);
  }

  async function regenerateCalendar() {
    setGeneratingCal(true);
    try {
      const res = await fetch("/api/admin/shorts/calendar", { method: "POST" });
      if (res.ok) await fetchData();
      else alert("Failed to generate calendar");
    } catch { alert("Error generating calendar"); }
    setGeneratingCal(false);
  }

  async function generateVideos() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/shorts/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: genTopic || undefined,
          count: genCount,
          autoPublish: false,
          contentType: genContentType || undefined,
          duration: genDuration ? Number(genDuration) : undefined,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        const rendering = result.results?.filter((r: { status: string }) => r.status === "rendering") || [];
        const errors = result.results?.filter((r: { status: string }) => r.status.startsWith("error")) || [];
        if (rendering.length > 0) {
          alert(`${rendering.length} video${rendering.length !== 1 ? "s" : ""} started rendering! They'll appear in "Recent Videos" below once rendering finishes (2-3 min).`);
          setGenTopic("");
        } else if (errors.length > 0) {
          alert(`Generation failed:\n${errors.map((e: { status: string }) => e.status).join("\n")}`);
        }
        await fetchData();
      } else {
        alert(`Failed: ${result.error || "Unknown error"}`);
      }
    } catch { alert("Generation failed"); }
    setGenerating(false);
  }

  async function publishVideo(slug: string) {
    setPublishing(slug);
    try {
      const res = await fetch("/api/admin/shorts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const result = await res.json();
      if (res.ok) {
        const platforms = result.results || [];
        const succeeded = platforms.filter((r: { status: string }) => r.status === "success");
        const failed = platforms.filter((r: { status: string }) => r.status === "error");
        const skipped = platforms.filter((r: { status: string }) => r.status === "skipped");
        let msg = `Published!\n\n✅ Success: ${succeeded.map((r: { platform: string }) => r.platform).join(", ") || "none"}`;
        if (failed.length) msg += `\n❌ Failed: ${failed.map((r: { platform: string }) => r.platform).join(", ")}`;
        if (skipped.length) msg += `\n⏭️ Skipped: ${skipped.map((r: { platform: string }) => r.platform).join(", ")}`;
        alert(msg);
        await fetchData();
      } else {
        alert(`Publish failed: ${result.error || "Unknown error"}`);
      }
    } catch { alert("Publish failed"); }
    setPublishing(null);
  }

  async function deleteVideo(slug: string) {
    if (!confirm("Delete this video? This cannot be undone.")) return;
    setDeleting(slug);
    try {
      const res = await fetch("/api/admin/shorts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) await fetchData();
      else alert("Failed to delete");
    } catch { alert("Delete failed"); }
    setDeleting(null);
  }

  function copyToClipboard(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  if (loading) return <div className="text-white/50 text-sm">Loading pipeline data...</div>;
  if (!data) return <div className="text-red-400 text-sm">Failed to load pipeline data.</div>;

  const today = new Date().toISOString().split("T")[0];
  const upcoming = data.calendar.filter((e) => !e.used && e.date >= today).slice(0, 7);
  const completed = data.calendar.filter((e) => e.used).length;
  const totalCal = data.calendar.length;
  const seriesEntries = Object.entries(data.seriesTracker).filter(([k]) => k !== "_recentTypes").sort(([, a], [, b]) => (b as number) - (a as number));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Shorts Automation</h1>
          <p className="text-white/50 text-sm mt-1">Full pipeline: AI script &rarr; voice &rarr; render &rarr; multi-platform upload</p>
        </div>
        <button
          onClick={toggleAutomation}
          disabled={toggling}
          className={`px-5 py-2.5 rounded-md text-sm font-bold transition-all disabled:opacity-50 ${
            data.config.enabled
              ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
              : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
          }`}
        >
          {toggling ? "..." : data.config.enabled ? "● Automation ON" : "○ Automation OFF"}
        </button>
      </div>

      {/* Generate On Demand */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4">Generate Videos</h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <input
            type="text"
            value={genTopic}
            onChange={(e) => setGenTopic(e.target.value)}
            placeholder="Topic (optional — AI picks if blank)"
            className="flex-1 px-4 py-2.5 rounded-md bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold"
          />
          <button
            onClick={generateVideos}
            disabled={generating}
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-2.5 rounded-md transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {generating ? "Generating..." : "Generate Now"}
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={genContentType}
            onChange={(e) => setGenContentType(e.target.value)}
            className="px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:border-gold"
          >
            <option value="">Content Type (auto)</option>
            <option value="listicle">Listicle</option>
            <option value="chart-breakdown">Chart Breakdown</option>
            <option value="myth-buster">Myth Buster</option>
            <option value="story">Story</option>
            <option value="quiz">Quiz</option>
            <option value="pov">POV</option>
            <option value="rapid-fire">Rapid Fire</option>
            <option value="debate">Debate</option>
          </select>
          <select
            value={genDuration}
            onChange={(e) => setGenDuration(e.target.value)}
            className="px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:border-gold"
          >
            <option value="">Duration (auto)</option>
            <option value="20">~20s (quick tip)</option>
            <option value="30">~30s (standard)</option>
            <option value="40">~40s (detailed)</option>
            <option value="50">~50s (deep dive)</option>
          </select>
          <select
            value={genCount}
            onChange={(e) => setGenCount(Number(e.target.value))}
            className="px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:border-gold"
          >
            <option value={1}>1 video</option>
            <option value={2}>2 videos</option>
            <option value={3}>3 videos</option>
            <option value={5}>5 videos</option>
          </select>
        </div>
        <p className="text-white/30 text-xs mt-2">
          AI script &rarr; ElevenLabs voice &rarr; Whisper captions &rarr; FFmpeg render. Takes ~3-5 min per video.
        </p>
      </div>

      {/* Pipeline Steps */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4">Daily Pipeline</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { icon: "📅", label: "Calendar", desc: "Pick topic" },
            { icon: "✍️", label: "Script", desc: "Claude AI" },
            { icon: "🎙️", label: "Voice", desc: "ElevenLabs" },
            { icon: "📝", label: "Captions", desc: "Whisper" },
            { icon: "🎬", label: "Render", desc: "FFmpeg" },
            { icon: "📤", label: "Upload", desc: "YT + FB + LI" },
            { icon: "📢", label: "Announce", desc: "TG + Discord" },
          ].map((s, i) => (
            <div key={i} className="text-center py-3">
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="text-white text-xs font-semibold">{s.label}</p>
              <p className="text-white/30 text-[10px] mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Videos */}
      {videos.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-white font-semibold text-sm mb-4">Recent Videos</h2>
          <div className="space-y-3">
            {videos.slice(0, 10).map((v, idx) => (
              <div key={v.slug} className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${
                        v.status === "published" ? "bg-green-400" :
                        v.status === "ready" ? "bg-blue-400" :
                        v.status === "rendering" ? "bg-yellow-400 animate-pulse" :
                        "bg-red-400"
                      }`}></span>
                      <h3 className="text-white text-sm font-semibold truncate">{v.title}</h3>
                      {v.contentType && (
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          v.contentType === "listicle" ? "bg-blue-500/20 text-blue-400" :
                          v.contentType === "myth-buster" ? "bg-red-500/20 text-red-400" :
                          v.contentType === "quiz" ? "bg-purple-500/20 text-purple-400" :
                          v.contentType === "chart-breakdown" ? "bg-green-500/20 text-green-400" :
                          v.contentType === "story" ? "bg-orange-500/20 text-orange-400" :
                          v.contentType === "pov" ? "bg-cyan-500/20 text-cyan-400" :
                          v.contentType === "rapid-fire" ? "bg-yellow-500/20 text-yellow-400" :
                          v.contentType === "debate" ? "bg-pink-500/20 text-pink-400" :
                          "bg-white/10 text-white/50"
                        }`}>{v.contentType}</span>
                      )}
                    </div>
                    <p className="text-white/30 text-xs">
                      {new Date(v.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} &middot;{" "}
                      <span className={
                        v.status === "published" ? "text-green-400" :
                        v.status === "ready" ? "text-blue-400" :
                        v.status === "rendering" ? "text-yellow-400" :
                        v.status === "failed" ? "text-red-400" : ""
                      }>{v.status === "ready" ? "Ready to publish" : v.status === "failed" ? "Failed" : v.status}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.youtubeUrl && (
                      <a href={v.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md hover:bg-red-500/30 transition-colors whitespace-nowrap">
                        YouTube
                      </a>
                    )}
                    <button
                      onClick={() => deleteVideo(v.slug)}
                      disabled={deleting === v.slug}
                      className="text-xs text-white/20 hover:text-red-400 px-2 py-1.5 rounded-md hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deleting === v.slug ? "..." : "✕"}
                    </button>
                  </div>
                </div>

                {/* Upload results (only for published) */}
                {v.status === "published" && v.uploadResults && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {v.uploadResults.map((r) => (
                      <span key={r.platform} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        r.status === "success" ? "bg-green-500/20 text-green-400" :
                        r.status === "skipped" ? "bg-white/10 text-white/30" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {r.platform.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions for ready videos */}
                {(v.status === "ready" || v.status === "published") && (
                  <div className="flex flex-wrap gap-2">
                    {v.videoUrl && (
                      <a href={v.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-white/10 text-white/70 px-3 py-1.5 rounded-md hover:bg-white/20 transition-colors">
                        Preview Video
                      </a>
                    )}
                    {v.copyText && (
                      <button
                        onClick={() => copyToClipboard(v.copyText!, idx)}
                        className="text-xs bg-gold/20 text-gold px-3 py-1.5 rounded-md hover:bg-gold/30 transition-colors"
                      >
                        {copiedIdx === idx ? "Copied!" : "Copy Caption"}
                      </button>
                    )}
                    {v.status === "ready" && (
                      <button
                        onClick={() => publishVideo(v.slug)}
                        disabled={publishing === v.slug}
                        className="text-xs bg-green-500/20 text-green-400 px-3 py-1.5 rounded-md hover:bg-green-500/30 transition-colors disabled:opacity-50"
                      >
                        {publishing === v.slug ? "Publishing..." : "Publish to All Platforms"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Content Calendar */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Content Calendar</h2>
            <div className="flex items-center gap-3">
              <span className="text-white/30 text-xs">{completed}/{totalCal} used</span>
              <button
                onClick={regenerateCalendar}
                disabled={generatingCal}
                className="text-xs bg-gold/20 text-gold px-3 py-1.5 rounded-md hover:bg-gold/30 transition-colors disabled:opacity-50"
              >
                {generatingCal ? "Generating..." : "Regenerate 30-day"}
              </button>
            </div>
          </div>
          {upcoming.length > 0 ? (
            <div className="space-y-2">
              {upcoming.map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-md bg-white/[0.03]">
                  <span className="text-white/30 text-xs font-mono w-20">{e.date}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    e.contentType === "listicle" ? "bg-blue-500/20 text-blue-400" :
                    e.contentType === "myth-buster" ? "bg-red-500/20 text-red-400" :
                    e.contentType === "quiz" ? "bg-purple-500/20 text-purple-400" :
                    e.contentType === "chart-breakdown" ? "bg-green-500/20 text-green-400" :
                    e.contentType === "story" ? "bg-orange-500/20 text-orange-400" :
                    "bg-white/10 text-white/50"
                  }`}>{e.contentType}</span>
                  <span className="text-white/80 text-xs truncate flex-1">{e.topic}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-xs">No upcoming entries. Generate a calendar to get started.</p>
          )}
        </div>

        {/* Series Tracker */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Series Tracker</h2>
          {seriesEntries.length > 0 ? (
            <div className="space-y-2">
              {seriesEntries.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between py-2 px-3 rounded-md bg-white/[0.03]">
                  <span className="text-white/80 text-xs">{name}</span>
                  <span className="text-gold text-xs font-bold">#{count as number}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-xs">No series tracked yet. Videos will be tracked after the first run.</p>
          )}
        </div>
      </div>

      {/* Performance Data */}
      {data.performance && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">YouTube Performance</h2>
            <span className="text-white/30 text-xs">Last pull: {data.performance.lastPull}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="text-center py-3 px-4 rounded-md bg-white/[0.03]">
              <p className="text-2xl font-bold text-gold">{data.performance.totalVideos}</p>
              <p className="text-white/40 text-xs mt-1">Total Videos</p>
            </div>
            <div className="text-center py-3 px-4 rounded-md bg-white/[0.03]">
              <p className="text-2xl font-bold text-green-400">{data.performance.topVideos?.length || 0}</p>
              <p className="text-white/40 text-xs mt-1">Top Performers</p>
            </div>
            <div className="text-center py-3 px-4 rounded-md bg-white/[0.03]">
              <p className="text-2xl font-bold text-white/60">{completed}</p>
              <p className="text-white/40 text-xs mt-1">Shorts Produced</p>
            </div>
          </div>
          {data.performance.topVideos?.length > 0 && (
            <>
              <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Top Videos</h3>
              <div className="space-y-1">
                {data.performance.topVideos.slice(0, 5).map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-white/[0.03]">
                    <span className="text-white/70 text-xs truncate flex-1">{v.title}</span>
                    <span className="text-green-400 text-xs font-bold ml-3">{v.views?.toLocaleString()} views</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Platform Distribution */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="text-white font-semibold text-sm mb-4">Distribution Platforms</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { name: "YouTube Shorts", status: "auto", color: "text-red-400" },
            { name: "Facebook Reels", status: "auto", color: "text-blue-400" },
            { name: "LinkedIn Video", status: "auto", color: "text-blue-300" },
            { name: "TikTok", status: "manual", color: "text-white/60" },
            { name: "Instagram Reels", status: "manual", color: "text-pink-400" },
            { name: "Telegram", status: "auto", color: "text-sky-400" },
            { name: "Discord", status: "auto", color: "text-indigo-400" },
          ].map((p) => (
            <div key={p.name} className="flex items-center gap-2.5 py-2.5 px-3 rounded-md bg-white/[0.03]">
              <span className={`w-2 h-2 rounded-full ${p.status === "auto" ? "bg-green-400" : "bg-yellow-400/60"}`}></span>
              <div>
                <p className={`text-xs font-semibold ${p.color}`}>{p.name}</p>
                <p className="text-white/30 text-[10px]">{p.status === "auto" ? "Automated" : "Manual"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
