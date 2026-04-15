import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, listFiles } from "@/lib/github";

export const dynamic = "force-dynamic";

interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
}

function makeId(type: string, date: string, index: number): string {
  return `${type}-${date}-${index}`;
}

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const countOnly = req.nextUrl.searchParams.get("count") === "true";

  const events: NotificationEvent[] = [];

  // 1. New subscribers
  try {
    const raw = await readFile("data/subscribers.json");
    const subs: { email?: string; date?: string; score?: number }[] = JSON.parse(raw);
    for (let i = 0; i < subs.length; i++) {
      const s = subs[i];
      if (s.date) {
        events.push({
          id: makeId("subscriber", s.date, i),
          type: "subscriber",
          title: "New subscriber",
          description: s.email ? `${s.email.replace(/@.*/, "@***")} signed up` : "New email signup",
          date: s.date,
        });
        // Hot lead detection
        if (s.score && s.score >= 50) {
          events.push({
            id: makeId("hot-lead", s.date, i),
            type: "hot-lead",
            title: "Lead became hot",
            description: s.email ? `${s.email.replace(/@.*/, "@***")} crossed score 50 (${s.score})` : `Lead score: ${s.score}`,
            date: s.date,
          });
        }
      }
    }
  } catch {}

  // 2. Payments
  try {
    const raw = await readFile("data/payments.json");
    const payments: { email?: string; plan?: string; amount?: string; date?: string }[] = JSON.parse(raw);
    for (let i = 0; i < payments.length; i++) {
      const p = payments[i];
      if (p.date) {
        events.push({
          id: makeId("payment", p.date, i),
          type: "payment",
          title: "New payment",
          description: `${p.plan || "Coaching"} - ${p.amount || "$??"} from ${p.email?.replace(/@.*/, "@***") || "unknown"}`,
          date: p.date,
        });
      }
    }
  } catch {}

  // 3. Blog posts from social-log (type=blog)
  try {
    const raw = await readFile("data/social-log.json");
    const logs: { type?: string; title?: string; content?: string; date?: string; postedAt?: string; createdAt?: string; platform?: string }[] = JSON.parse(raw);
    for (let i = 0; i < logs.length; i++) {
      const entry = logs[i];
      const date = entry.date || entry.postedAt || entry.createdAt || "";
      if (entry.type === "blog" && date) {
        events.push({
          id: makeId("blog", date, i),
          type: "blog",
          title: "Blog post generated",
          description: entry.title || entry.content?.slice(0, 80) || "New blog post",
          date,
        });
      }
    }
  } catch {}

  // 4. Chat transcripts
  try {
    const files = await listFiles("data/chat-transcripts", ".json");
    for (let i = 0; i < files.length; i++) {
      try {
        const raw = await readFile(files[i]);
        const chat = JSON.parse(raw);
        const date = chat.startedAt || chat.date || chat.createdAt || "";
        if (date) {
          events.push({
            id: makeId("chat", date, i),
            type: "chat",
            title: "New chatbot conversation",
            description: chat.firstMessage?.slice(0, 80) || chat.messages?.[0]?.content?.slice(0, 80) || "Visitor started a chat",
            date,
          });
        }
      } catch {}
    }
  } catch {}

  // 5. Shorts renders (published videos)
  try {
    const files = await listFiles("data/shorts/renders", ".json");
    for (let i = 0; i < files.length; i++) {
      try {
        const raw = await readFile(files[i]);
        const render = JSON.parse(raw);
        if (render.status === "published") {
          const date = render.publishedAt || render.createdAt || render.date || "";
          if (date) {
            events.push({
              id: makeId("video", date, i),
              type: "video",
              title: "Video published",
              description: render.title || render.topic || "Short video published",
              date,
            });
          }
        }
        // Failed renders
        if (render.status === "failed" || render.error) {
          const date = render.createdAt || render.date || "";
          if (date) {
            events.push({
              id: makeId("alert", date, i),
              type: "alert",
              title: "Failed automation",
              description: render.error?.slice(0, 80) || `Render failed: ${render.title || "unknown"}`,
              date,
            });
          }
        }
      } catch {}
    }
  } catch {}

  // 6. Comment replies
  try {
    const raw = await readFile("data/reply-notifications.json");
    const replies: { id?: string; platform?: string; postTitle?: string; subreddit?: string; replyAuthor?: string; replyText?: string; commentUrl?: string; detectedAt?: string }[] = JSON.parse(raw);
    for (let i = 0; i < replies.length; i++) {
      const r = replies[i];
      if (r.detectedAt) {
        events.push({
          id: r.id || makeId("reply", r.detectedAt, i),
          type: "reply",
          title: "Comment reply received",
          description: `u/${r.replyAuthor || "someone"} replied in r/${r.subreddit || r.platform}: "${(r.replyText || "").slice(0, 80)}"`,
          date: r.detectedAt,
        });
      }
    }
  } catch {}

  // 7. Reviews pending
  try {
    const raw = await readFile("data/reviews-pending.json");
    const reviews: { name?: string; date?: string; createdAt?: string; rating?: number }[] = JSON.parse(raw);
    for (let i = 0; i < reviews.length; i++) {
      const r = reviews[i];
      const date = r.date || r.createdAt || "";
      if (date) {
        events.push({
          id: makeId("review", date, i),
          type: "review",
          title: "New review submitted",
          description: `${r.name || "Anonymous"} left a ${r.rating || "??"}-star review`,
          date,
        });
      }
    }
  } catch {}

  // Sort by date descending, take last 50
  events.sort((a, b) => (a.date > b.date ? -1 : 1));
  const trimmed = events.slice(0, 50);

  // Count-only mode: return unread count (events from last 24 hours)
  if (countOnly) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const unreadCount = trimmed.filter((e) => e.date >= cutoff).length;
    return NextResponse.json({ unreadCount });
  }

  return NextResponse.json({ events: trimmed });
}
