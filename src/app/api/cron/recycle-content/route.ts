import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile, listFiles } from "@/lib/github";
import { postToAll } from "@/lib/social";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

interface RecycleLogEntry {
  slug: string;
  recycledAt: string;
  caption: string;
}

interface BlogMetadata {
  title: string;
  excerpt: string;
  date: string;
  coverImage?: string;
  tags?: string[];
}

function parseMetadata(content: string): BlogMetadata | null {
  try {
    const match = content.match(
      /export\s+const\s+metadata\s*=\s*(\{[\s\S]*?\n\})/
    );
    if (!match) return null;
    // Use Function constructor to evaluate the object literal safely
    const fn = new Function(`return ${match[1]}`);
    return fn() as BlogMetadata;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Read all blog posts
    const files = await listFiles("content/blog", ".mdx");
    if (files.length === 0) {
      return NextResponse.json({ skipped: true, reason: "No blog posts found" });
    }

    // Read recycle log
    let recycleLog: RecycleLogEntry[] = [];
    try {
      const logRaw = await readFile("data/recycle-log.json");
      recycleLog = JSON.parse(logRaw);
    } catch { /* file doesn't exist yet */ }

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build set of recently recycled slugs (within last 30 days)
    const recentlyRecycled = new Set(
      recycleLog
        .filter((entry) => new Date(entry.recycledAt) > thirtyDaysAgo)
        .map((entry) => entry.slug)
    );

    // Filter to eligible posts: older than 14 days and not recently recycled
    const eligible: { file: string; slug: string; date: string }[] = [];
    for (const file of files) {
      // Extract slug from filename: content/blog/2026-04-03-some-title.mdx -> 2026-04-03-some-title
      const slug = file.replace(/^content\/blog\//, "").replace(/\.mdx$/, "");
      // Extract date from slug
      const dateMatch = slug.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) continue;

      const postDate = new Date(dateMatch[1]);
      if (postDate > fourteenDaysAgo) continue; // Too recent
      if (recentlyRecycled.has(slug)) continue; // Recently recycled

      eligible.push({ file, slug, date: dateMatch[1] });
    }

    if (eligible.length === 0) {
      return NextResponse.json({
        skipped: true,
        reason: "No eligible posts to recycle (all too recent or recently recycled)",
      });
    }

    // Pick the best performing post (most social shares) from eligible ones
    // Check social-log.json for how many times each post was shared
    let socialLog: { slug?: string }[] = [];
    try {
      socialLog = JSON.parse(await readFile("data/social-log.json"));
    } catch {}
    const shareCount = new Map<string, number>();
    for (const entry of socialLog) {
      if (entry.slug) shareCount.set(entry.slug, (shareCount.get(entry.slug) || 0) + 1);
    }
    // Sort by share count descending (most shared = best performing), then by date as tiebreaker
    eligible.sort((a, b) => {
      const sharesA = shareCount.get(a.slug) || 0;
      const sharesB = shareCount.get(b.slug) || 0;
      if (sharesB !== sharesA) return sharesB - sharesA;
      return b.date.localeCompare(a.date); // newer first as tiebreaker
    });
    const pick = eligible[0];

    // Read the post content to get metadata
    const postContent = await readFile(pick.file);
    const metadata = parseMetadata(postContent);
    if (!metadata) {
      return NextResponse.json({
        error: "Failed to parse metadata",
        slug: pick.slug,
      }, { status: 500 });
    }

    // Generate a fresh social caption using Claude
    const anthropic = new Anthropic();
    const captionRes = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `You are a social media manager for R2F Trading, an ICT trading coaching brand.

Generate a FRESH, engaging social media caption for resharing this older blog post. Make it feel NEW and timely — not like a reshare. Use a different angle than the original excerpt.

TITLE: ${metadata.title}
ORIGINAL EXCERPT: ${metadata.excerpt}
TAGS: ${(metadata.tags || []).join(", ")}

Rules:
- Under 200 characters (for Twitter compatibility)
- Start with a hook or question
- Include the URL placeholder {URL} at the end
- Do NOT use "throwback" or "icymi" or "in case you missed it"
- Make it feel like a fresh insight, not a repost
- No hashtags (they'll be added automatically)

Return ONLY the caption text, nothing else.`,
      }],
    });

    let caption = captionRes.content[0].type === "text"
      ? captionRes.content[0].text.trim()
      : "";

    if (!caption) {
      caption = `${metadata.title} — one of the most important concepts every trader needs to master. {URL}`;
    }

    // Replace URL placeholder
    const postUrl = `https://r2ftrading.com/trading-insights/${pick.slug}`;
    caption = caption.replace("{URL}", postUrl);
    // If no URL was in the caption, append it
    if (!caption.includes(postUrl)) {
      caption = `${caption}\n\n${postUrl}`;
    }

    // Post to all social platforms
    const socialResults = await postToAll({
      title: metadata.title,
      excerpt: caption,
      slug: pick.slug,
      coverImage: metadata.coverImage || "",
      tags: metadata.tags || [],
    });

    console.log("[recycle] Social results:", JSON.stringify(socialResults));

    // Save to recycle log
    recycleLog.push({
      slug: pick.slug,
      recycledAt: now.toISOString(),
      caption,
    });

    // Keep only last 200 entries
    if (recycleLog.length > 200) recycleLog = recycleLog.slice(-200);

    await commitFile(
      "data/recycle-log.json",
      JSON.stringify(recycleLog, null, 2),
      `Recycle log: ${metadata.title.slice(0, 40)}`
    );

    // Send Telegram notification
    try {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
      if (tgToken && chatId) {
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `♻️ Recycled: ${metadata.title}\n\n${postUrl}`,
            parse_mode: "Markdown",
            disable_web_page_preview: false,
          }),
        });
      }
    } catch {
      console.error("[recycle] Telegram notification failed");
    }

    return NextResponse.json({
      success: true,
      recycled: pick.slug,
      title: metadata.title,
      caption,
      socialResults,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Recycle failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
