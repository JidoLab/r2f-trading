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

export default function AdminShortsPage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [generatingCal, setGeneratingCal] = useState(false);

  async function fetchData() {
    try {
      const res = await fetch("/api/admin/shorts/pipeline");
      if (res.ok) setData(await res.json());
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
          <p className="text-white/50 text-sm mt-1">Full pipeline: AI script → voice → render → multi-platform upload</p>
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

      {/* Pipeline Steps */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4">Daily Pipeline</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { icon: "📅", label: "Calendar", desc: "Pick topic" },
            { icon: "✍️", label: "Script", desc: "Claude AI" },
            { icon: "🎙️", label: "Voice", desc: "ElevenLabs" },
            { icon: "📝", label: "Captions", desc: "Whisper" },
            { icon: "🎬", label: "Render", desc: "Creatomate" },
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

      {/* Pending Scripts */}
      {data.pendingScripts.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-white font-semibold text-sm mb-4">Pending Scripts</h2>
          <p className="text-white/40 text-xs mb-3">Generated scripts waiting to be rendered and uploaded.</p>
          <div className="space-y-1">
            {data.pendingScripts.map((slug) => (
              <div key={slug} className="flex items-center gap-3 py-2 px-3 rounded-md bg-white/[0.03]">
                <span className="w-2 h-2 rounded-full bg-yellow-400/60"></span>
                <span className="text-white/70 text-xs">{slug}</span>
              </div>
            ))}
          </div>
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
