"use client";

import { useEffect, useState } from "react";

interface Post {
  platform: string;
  type: string;
  content: string;
  time: string;
  date?: string;
}

interface DayData {
  date: string;
  posts: Post[];
}

interface CalendarData {
  week: string;
  days: DayData[];
  streak: number;
  weekTotal: number;
}

const PLATFORMS = ["twitter", "facebook", "linkedin", "reddit", "telegram", "discord", "youtube"];

const PLATFORM_LABELS: Record<string, string> = {
  twitter: "Twitter / X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  reddit: "Reddit",
  telegram: "Telegram",
  discord: "Discord",
  youtube: "YouTube",
};

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  blog: { bg: "bg-green-500", text: "text-green-400", label: "Blog Share" },
  "blog-share": { bg: "bg-green-500", text: "text-green-400", label: "Blog Share" },
  text: { bg: "bg-blue-500", text: "text-blue-400", label: "Text Post" },
  "text-post": { bg: "bg-blue-500", text: "text-blue-400", label: "Text Post" },
  video: { bg: "bg-purple-500", text: "text-purple-400", label: "Video" },
  "reddit-comment": { bg: "bg-orange-500", text: "text-orange-400", label: "Reddit Comment" },
  "twitter-reply": { bg: "bg-yellow-500", text: "text-yellow-400", label: "Twitter Reply" },
};

function getTypeStyle(type: string) {
  return TYPE_COLORS[type] || { bg: "bg-white/50", text: "text-white/60", label: type };
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split("T")[0];
}

export default function SocialCalendarPage() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<string>("");

  function loadWeek(week?: string) {
    setLoading(true);
    const url = week ? `/api/admin/social-calendar?week=${week}` : "/api/admin/social-calendar";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setCurrentWeek(d.week);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadWeek();
  }, []);

  function navigateWeek(direction: number) {
    if (!currentWeek) return;
    const d = new Date(currentWeek + "T00:00:00");
    d.setDate(d.getDate() + direction * 7);
    loadWeek(d.toISOString().split("T")[0]);
  }

  const todayPosts: Post[] = [];
  if (data) {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayDay = data.days.find((d) => d.date === todayStr);
    if (todayDay) todayPosts.push(...todayDay.posts);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Social Media Calendar</h1>
      <p className="text-white/50 text-sm mb-8">Weekly posting activity across all platforms.</p>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs mb-1">Posting Streak</p>
          <p className="text-2xl font-black text-gold" style={{ fontFamily: "var(--font-heading)" }}>
            {data?.streak || 0} days
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs mb-1">Posts This Week</p>
          <p className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>
            {data?.weekTotal || 0}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs mb-1">Today&apos;s Posts</p>
          <p className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>
            {todayPosts.length}
          </p>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateWeek(-1)}
          className="text-white/50 hover:text-white text-sm px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
        >
          &larr; Prev Week
        </button>
        <span className="text-white/70 text-sm font-semibold">
          {currentWeek ? `Week of ${formatShortDate(currentWeek)}` : "Loading..."}
        </span>
        <button
          onClick={() => navigateWeek(1)}
          className="text-white/50 hover:text-white text-sm px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
        >
          Next Week &rarr;
        </button>
      </div>

      {/* Color Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {Object.entries(TYPE_COLORS).filter(([key]) => !key.includes("-share") && !key.includes("-post")).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${val.bg}`} />
            <span className="text-white/40 text-xs">{val.label}</span>
          </div>
        ))}
      </div>

      {/* Weekly Grid */}
      {loading ? (
        <p className="text-white/40">Loading calendar...</p>
      ) : !data ? (
        <p className="text-white/40">Failed to load calendar data.</p>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-xs font-bold text-white/40 uppercase tracking-wider text-left w-28">
                    Platform
                  </th>
                  {data.days.map((day, i) => (
                    <th
                      key={day.date}
                      className={`px-3 py-3 text-xs font-bold uppercase tracking-wider text-center ${
                        isToday(day.date) ? "text-gold bg-gold/5" : "text-white/40"
                      }`}
                    >
                      <div>{DAY_NAMES[i]}</div>
                      <div className="text-[10px] font-normal mt-0.5 opacity-60">
                        {formatShortDate(day.date)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLATFORMS.map((platform) => (
                  <tr key={platform} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-sm text-white/70 font-medium">
                      {PLATFORM_LABELS[platform]}
                    </td>
                    {data.days.map((day) => {
                      const cellPosts = day.posts.filter(
                        (p) => p.platform.toLowerCase() === platform
                      );
                      return (
                        <td
                          key={day.date}
                          className={`px-3 py-3 text-center ${
                            isToday(day.date) ? "bg-gold/5" : ""
                          }`}
                        >
                          {cellPosts.length === 0 ? (
                            <span className="text-white/10">--</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {cellPosts.map((post, pi) => {
                                const style = getTypeStyle(post.type);
                                return (
                                  <span
                                    key={pi}
                                    className={`w-3 h-3 rounded-full ${style.bg} cursor-default`}
                                    title={`${style.label}: ${post.content.slice(0, 60)}`}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Today's Posts List */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Today&apos;s Posts</h2>
        {todayPosts.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
            <p className="text-white/40 text-sm">No posts today yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayPosts.map((post, i) => {
              const style = getTypeStyle(post.type);
              return (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-start gap-3"
                >
                  <span className={`w-3 h-3 rounded-full mt-1 shrink-0 ${style.bg}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/80 text-sm font-semibold">
                        {PLATFORM_LABELS[post.platform.toLowerCase()] || post.platform}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${style.text} bg-white/5`}>
                        {style.label}
                      </span>
                      {post.time && (
                        <span className="text-white/30 text-xs ml-auto">{post.time}</span>
                      )}
                    </div>
                    <p className="text-white/50 text-sm truncate">{post.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
