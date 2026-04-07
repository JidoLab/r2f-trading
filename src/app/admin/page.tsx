"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardData {
  posts: { total: number; today: number; latest: { title: string; slug: string; date: string } | null };
  subscribers: { total: number; newToday: number; hot: number; warm: number };
  shorts: { ready: number; published: number; rendering: number };
  chatsToday: number;
  socialThisWeek: number;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const now = new Date().toLocaleString("en-GB", { timeZone: "Asia/Bangkok", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className="text-white/50 text-sm">Loading dashboard...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-white/40 text-sm mt-1">{now} (Bangkok)</p>
        </div>
        <Link
          href="/admin/share"
          className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-5 py-2.5 rounded-md transition-all"
        >
          Quick Share
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Subscribers</p>
          <p className="text-3xl font-black text-gold">{data?.subscribers.total || 0}</p>
          {(data?.subscribers.newToday || 0) > 0 && (
            <p className="text-green-400 text-xs mt-1">+{data?.subscribers.newToday} today</p>
          )}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Blog Posts</p>
          <p className="text-3xl font-black text-white">{data?.posts.total || 0}</p>
          {(data?.posts.today || 0) > 0 && (
            <p className="text-green-400 text-xs mt-1">+{data?.posts.today} today</p>
          )}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Shorts Published</p>
          <p className="text-3xl font-black text-white">{data?.shorts.published || 0}</p>
          {(data?.shorts.ready || 0) > 0 && (
            <p className="text-blue-400 text-xs mt-1">{data?.shorts.ready} ready to publish</p>
          )}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Hot Leads</p>
          <p className="text-3xl font-black text-red-400">{data?.subscribers.hot || 0}</p>
          {(data?.subscribers.warm || 0) > 0 && (
            <p className="text-yellow-400 text-xs mt-1">{data?.subscribers.warm} warm</p>
          )}
        </div>
      </div>

      {/* Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Today&apos;s Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-white/60 text-sm">Blog posts generated</span>
              <span className="text-white font-bold text-sm">{data?.posts.today || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <span className="text-white/60 text-sm">Shorts rendering</span>
              <span className="text-yellow-400 font-bold text-sm">{data?.shorts.rendering || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <span className="text-white/60 text-sm">Chatbot conversations</span>
              <span className="text-white font-bold text-sm">{data?.chatsToday || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <span className="text-white/60 text-sm">Social posts this week</span>
              <span className="text-white font-bold text-sm">{data?.socialThisWeek || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/posts" className="bg-white/[0.03] border border-white/10 hover:border-gold/30 rounded-lg p-4 text-center transition-colors">
              <p className="text-lg mb-1">📝</p>
              <p className="text-white text-xs font-semibold">Blog Posts</p>
            </Link>
            <Link href="/admin/shorts" className="bg-white/[0.03] border border-white/10 hover:border-gold/30 rounded-lg p-4 text-center transition-colors">
              <p className="text-lg mb-1">🎬</p>
              <p className="text-white text-xs font-semibold">Shorts</p>
            </Link>
            <Link href="/admin/subscribers" className="bg-white/[0.03] border border-white/10 hover:border-gold/30 rounded-lg p-4 text-center transition-colors">
              <p className="text-lg mb-1">👥</p>
              <p className="text-white text-xs font-semibold">Subscribers</p>
            </Link>
            <Link href="/admin/share" className="bg-white/[0.03] border border-white/10 hover:border-gold/30 rounded-lg p-4 text-center transition-colors">
              <p className="text-lg mb-1">🔗</p>
              <p className="text-white text-xs font-semibold">Quick Share</p>
            </Link>
            <Link href="/admin/chat-logs" className="bg-white/[0.03] border border-white/10 hover:border-gold/30 rounded-lg p-4 text-center transition-colors">
              <p className="text-lg mb-1">💬</p>
              <p className="text-white text-xs font-semibold">Chat Logs</p>
            </Link>
            <Link href="/admin/trends" className="bg-white/[0.03] border border-white/10 hover:border-gold/30 rounded-lg p-4 text-center transition-colors">
              <p className="text-lg mb-1">📊</p>
              <p className="text-white text-xs font-semibold">Trends</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Latest Post */}
      {data?.posts.latest && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-white font-semibold text-sm mb-3">Latest Blog Post</h2>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-white/90 text-sm font-medium truncate">{data.posts.latest.title}</p>
              <p className="text-white/30 text-xs mt-1">{data.posts.latest.date}</p>
            </div>
            <a
              href={`/trading-insights/${data.posts.latest.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold text-xs font-bold hover:text-gold-light transition-colors ml-4"
            >
              View ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
