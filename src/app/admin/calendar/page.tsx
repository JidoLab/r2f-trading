"use client";

import { useEffect, useState } from "react";

interface Post {
  slug: string;
  title: string;
  date: string;
  tags: string[];
}

interface SocialEntry {
  date: string;
  slug: string;
  title: string;
  results: { platform: string; status: string; message?: string }[];
}

export default function ContentCalendarPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [socialLog, setSocialLog] = useState<SocialEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/posts").then((r) => r.json()),
      fetch("/api/admin/social-log").then((r) => r.json()).catch(() => ({ log: [] })),
    ]).then(([postsData, socialData]) => {
      setPosts(postsData.posts || []);
      setSocialLog(socialData.log || []);
      setLoading(false);
    });
  }, []);

  // Group posts by date
  const postsByDate: Record<string, Post[]> = {};
  for (const post of posts) {
    if (!postsByDate[post.date]) postsByDate[post.date] = [];
    postsByDate[post.date].push(post);
  }

  // Social results by slug
  const socialBySlug: Record<string, SocialEntry> = {};
  for (const entry of socialLog) {
    socialBySlug[entry.slug] = entry;
  }

  const dates = Object.keys(postsByDate).sort((a, b) => (a > b ? -1 : 1));

  if (loading) return <p className="text-white/40">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Content Calendar</h1>
      <p className="text-white/50 text-sm mb-8">Published posts and their social distribution status.</p>

      <div className="space-y-6">
        {dates.map((date) => (
          <div key={date}>
            <h2 className="text-sm font-bold text-gold mb-3 uppercase tracking-wider">{date}</h2>
            <div className="space-y-3">
              {postsByDate[date].map((post) => {
                const social = socialBySlug[post.slug];
                return (
                  <div key={post.slug} className="bg-white/5 border border-white/10 rounded-lg p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-white/90 text-sm font-medium mb-1">{post.title}</p>
                        <div className="flex gap-1 flex-wrap">
                          {post.tags.map((tag) => (
                            <span key={tag} className="text-[9px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <a
                        href={`/trading-insights/${post.slug}`}
                        target="_blank"
                        className="text-white/40 hover:text-white text-xs flex-shrink-0"
                      >
                        View ↗
                      </a>
                    </div>

                    {social && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-white/30 text-xs mb-2">Social Distribution:</p>
                        <div className="flex flex-wrap gap-2">
                          {social.results.map((r, i) => (
                            <span
                              key={i}
                              className={`text-[10px] font-semibold px-2 py-1 rounded ${
                                r.status === "success"
                                  ? "bg-green-500/10 text-green-400"
                                  : r.status === "skipped"
                                  ? "bg-white/5 text-white/30"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                              title={r.message || ""}
                            >
                              {r.platform}: {r.status}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {!social && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-white/20 text-xs">No social distribution recorded</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
