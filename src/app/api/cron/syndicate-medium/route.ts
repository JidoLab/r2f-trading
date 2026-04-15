import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { getAllPosts, getRawContent } from "@/lib/blog";
import { postToMedium } from "@/lib/social";

export const maxDuration = 120;

const SYNDICATION_LOG_PATH = "data/medium-syndication-log.json";

interface SyndicationEntry {
  slug: string;
  title: string;
  syndicatedAt: string;
  mediumUrl: string | null;
  status: "success" | "error";
}

async function loadLog(): Promise<SyndicationEntry[]> {
  try {
    return JSON.parse(await readFile(SYNDICATION_LOG_PATH));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.MEDIUM_API_TOKEN) {
    return NextResponse.json({ skipped: true, message: "No MEDIUM_API_TOKEN configured" });
  }

  try {
    const log = await loadLog();
    const syndicatedSlugs = new Set(log.filter(e => e.status === "success").map(e => e.slug));

    // Get posts from the last 7 days that haven't been syndicated
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const posts = getAllPosts()
      .filter(p => p.date >= weekAgo && !syndicatedSlugs.has(p.slug))
      .slice(0, 3); // Max 3 per run to respect rate limits

    if (posts.length === 0) {
      return NextResponse.json({ syndicated: 0, message: "No new posts to syndicate" });
    }

    const results: SyndicationEntry[] = [];

    for (const post of posts) {
      const fullContent = getRawContent(post.slug);

      const result = await postToMedium({
        title: post.title,
        excerpt: post.excerpt,
        slug: post.slug,
        coverImage: post.coverImage,
        tags: post.tags,
        fullContent: fullContent || undefined,
      });

      results.push({
        slug: post.slug,
        title: post.title,
        syndicatedAt: new Date().toISOString(),
        mediumUrl: result.status === "success" ? (result.message || null) : null,
        status: result.status === "success" ? "success" : "error",
      });

      // Delay between posts
      if (posts.indexOf(post) < posts.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Save log
    const updatedLog = [...results, ...log].slice(0, 100);
    await commitFile(
      SYNDICATION_LOG_PATH,
      JSON.stringify(updatedLog, null, 2),
      `Medium syndication: ${results.filter(r => r.status === "success").length} posts`
    );

    // Telegram notification
    const succeeded = results.filter(r => r.status === "success");
    if (succeeded.length > 0) {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const tgChat = process.env.TELEGRAM_OWNER_CHAT_ID;
      if (tgToken && tgChat) {
        const titles = succeeded.map(s => `• ${s.title}`).join("\n");
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgChat,
            text: `📝 ${succeeded.length} blog post${succeeded.length > 1 ? "s" : ""} syndicated to Medium!\n\n${titles}`,
          }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      syndicated: succeeded.length,
      errors: results.filter(r => r.status === "error").length,
      results,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
