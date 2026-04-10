import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, listFiles } from "@/lib/github";

export const dynamic = "force-dynamic";

interface SocialLogEntry {
  date: string;
  slug?: string;
  title?: string;
  type?: string;
  postType?: string;
  text?: string;
  results: { platform: string; status: string; message?: string }[];
}

interface ShortRender {
  slug: string;
  title: string;
  status: string;
  createdAt: string;
  uploadResults?: { platform: string; status: string; url?: string }[];
}

interface RedditComment {
  postId: string;
  subreddit: string;
  postTitle: string;
  commentText: string;
  mentionedR2F: boolean;
  commentedAt: string;
  permalink: string;
}

interface TwitterReply {
  tweetId?: string;
  replyTo?: string;
  text?: string;
  date?: string;
  repliedAt?: string;
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // --- Social log ---
  let socialLog: SocialLogEntry[] = [];
  try {
    const raw = await readFile("data/social-log.json");
    socialLog = JSON.parse(raw);
  } catch {}

  // Blog posts from social log (entries with a slug, no type=text)
  const blogEntries = socialLog.filter(e => e.slug && e.type !== "text");
  // Text social posts
  const textPosts = socialLog.filter(e => e.type === "text");

  // Blog rankings: count successful platform posts per slug
  const blogMap = new Map<string, { title: string; date: string; platforms: Set<string>; totalShares: number }>();
  for (const entry of blogEntries) {
    const key = entry.slug!;
    if (!blogMap.has(key)) {
      blogMap.set(key, { title: entry.title || key, date: entry.date, platforms: new Set(), totalShares: 0 });
    }
    const rec = blogMap.get(key)!;
    for (const r of entry.results) {
      if (r.status === "success") {
        rec.platforms.add(r.platform);
        rec.totalShares++;
      }
    }
  }
  const blogRankings = Array.from(blogMap.entries())
    .map(([slug, data]) => ({
      slug,
      title: data.title,
      date: data.date,
      platforms: Array.from(data.platforms),
      totalShares: data.totalShares,
    }))
    .sort((a, b) => b.totalShares - a.totalShares)
    .slice(0, 5);

  // --- Shorts renders ---
  const shortRankings: { slug: string; title: string; date: string; platforms: string[]; status: string }[] = [];
  try {
    const files = await listFiles("data/shorts/renders");
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(file);
        const data: ShortRender = JSON.parse(raw);
        const platforms: string[] = [];
        if (data.uploadResults) {
          for (const u of data.uploadResults) {
            if (u.status === "success") platforms.push(u.platform);
          }
        }
        shortRankings.push({
          slug: data.slug,
          title: data.title,
          date: data.createdAt,
          platforms,
          status: data.status,
        });
      } catch {}
    }
  } catch {}
  shortRankings.sort((a, b) => b.platforms.length - a.platforms.length);
  const topShorts = shortRankings.slice(0, 5);

  // --- Text posts ranking ---
  const textPostRankings = textPosts
    .map(e => {
      const successCount = e.results.filter(r => r.status === "success").length;
      const platforms = e.results.filter(r => r.status === "success").map(r => r.platform);
      return {
        postType: e.postType || "text",
        text: (e.text || "").slice(0, 120),
        date: e.date,
        platforms,
        successCount,
      };
    })
    .sort((a, b) => b.successCount - a.successCount)
    .slice(0, 5);

  // --- Reddit comments ---
  let redditComments: RedditComment[] = [];
  try {
    const raw = await readFile("data/reddit-engage-log.json");
    redditComments = JSON.parse(raw);
  } catch {}
  const topReddit = redditComments
    .sort((a, b) => (b.commentedAt || "").localeCompare(a.commentedAt || ""))
    .slice(0, 5)
    .map(c => ({
      subreddit: c.subreddit,
      postTitle: c.postTitle,
      date: c.commentedAt,
      mentionedR2F: c.mentionedR2F,
      permalink: c.permalink,
    }));

  // --- Twitter replies ---
  let twitterReplies: TwitterReply[] = [];
  try {
    const raw = await readFile("data/twitter-engage-log.json");
    twitterReplies = JSON.parse(raw);
  } catch {}
  const topTwitter = twitterReplies
    .sort((a, b) => (b.repliedAt || b.date || "").localeCompare(a.repliedAt || a.date || ""))
    .slice(0, 5)
    .map(t => ({
      replyTo: t.replyTo || t.tweetId || "Unknown",
      text: (t.text || "").slice(0, 120),
      date: t.repliedAt || t.date || "",
    }));

  // --- Summary ---
  const publishedShorts = shortRankings.filter(s => s.status === "published").length;
  const summary = {
    blogs: blogEntries.length,
    shorts: publishedShorts,
    socialPosts: textPosts.length,
    engagements: redditComments.length + twitterReplies.length,
  };

  return NextResponse.json({
    summary,
    blogRankings,
    shortRankings: topShorts,
    textPostRankings,
    redditComments: topReddit,
    twitterReplies: topTwitter,
  });
}
