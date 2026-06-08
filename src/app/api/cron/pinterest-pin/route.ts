import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile, listFiles } from "@/lib/github";
import { pinToPinterest } from "@/lib/social";
import { getAllPosts } from "@/lib/blog";
import { sendTelegramReport } from "@/lib/telegram-report";

export const maxDuration = 120;

const SITE_URL = "https://www.r2ftrading.com";
const LOG_PATH = "data/pinterest-pin-log.json";

// Pins per run. Pinterest rewards steady daily pinning over bursts, so we
// drip a small number. 1x/day cron => ~2 evergreen pins/day, all linking
// back to on-site content. Zero AI cost (descriptions templated from
// existing post metadata).
const MAX_PINS_PER_RUN = 2;
const MAX_LOG_ENTRIES = 5000;

const HASHTAGS =
  "#ICTTrading #ForexEducation #SmartMoneyConcepts #TradingMentorship #FundedTrader #R2FTrading #ForexTrading #PriceAction";

interface PinLogEntry {
  key: string; // stable dedupe key, e.g. "infographic:<slug>" / "cover:<slug>"
  slug: string;
  kind: "infographic" | "cover";
  title: string;
  link: string;
  imageUrl: string;
  pinnedAt: string;
}

interface PinCandidate {
  key: string;
  slug: string;
  kind: "infographic" | "cover";
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  date: string;
}

async function loadLog(): Promise<PinLogEntry[]> {
  try {
    const raw = await readFile(LOG_PATH);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Re-fetch + merge on save so concurrent runs can't reopen the dedupe hole
// (same defensive pattern as reddit-engage).
async function saveLog(entries: PinLogEntry[]): Promise<void> {
  let remote: PinLogEntry[] = [];
  try {
    remote = await loadLog();
  } catch {
    remote = [];
  }
  const seen = new Set(remote.map((e) => e.key));
  const merged = [...remote];
  for (const e of entries) {
    if (!seen.has(e.key)) {
      merged.push(e);
      seen.add(e.key);
    }
  }
  const trimmed =
    merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged;
  await commitFile(
    LOG_PATH,
    JSON.stringify(trimmed, null, 2),
    `Pinterest pin log: ${trimmed[trimmed.length - 1]?.slug || "update"}`
  );
}

// Build the pinnable queue from existing assets. Infographics are the
// best-performing Pinterest format (tall, value-dense), so they rank above
// blog covers. Newest content first.
async function buildQueue(): Promise<PinCandidate[]> {
  const posts = getAllPosts();
  const bySlug = new Map(posts.map((p) => [p.slug, p]));

  // Which infographics actually exist on disk (filename = "<slug>.png")
  let infographicSlugs = new Set<string>();
  try {
    const files = await listFiles("public/infographics", ".png");
    infographicSlugs = new Set(
      files.map((f) => f.split("/").pop()!.replace(/\.png$/, ""))
    );
  } catch {
    // none yet
  }

  const candidates: PinCandidate[] = [];

  // 1) Infographic pins (highest priority)
  for (const slug of infographicSlugs) {
    const post = bySlug.get(slug);
    if (!post) continue; // orphan infographic with no matching post
    candidates.push({
      key: `infographic:${slug}`,
      slug,
      kind: "infographic",
      title: post.title,
      description: `${post.excerpt}\n\n${HASHTAGS}`,
      link: `${SITE_URL}/trading-insights/${slug}`,
      imageUrl: `${SITE_URL}/infographics/${slug}.png`,
      date: post.date || "",
    });
  }

  // 2) Blog cover pins (fallback / additional reach)
  for (const post of posts) {
    if (!post.coverImage) continue;
    candidates.push({
      key: `cover:${post.slug}`,
      slug: post.slug,
      kind: "cover",
      title: post.title,
      description: `${post.excerpt}\n\n${HASHTAGS}`,
      link: `${SITE_URL}/trading-insights/${post.slug}`,
      imageUrl: post.coverImage.startsWith("http")
        ? post.coverImage
        : `${SITE_URL}${post.coverImage}`,
      date: post.date || "",
    });
  }

  // Infographics first, then newest within each kind
  const kindRank = { infographic: 0, cover: 1 };
  candidates.sort((a, b) => {
    if (kindRank[a.kind] !== kindRank[b.kind]) {
      return kindRank[a.kind] - kindRank[b.kind];
    }
    return (b.date || "").localeCompare(a.date || "");
  });

  return candidates;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!process.env.PINTEREST_ACCESS_TOKEN || !process.env.PINTEREST_BOARD_ID) {
      return NextResponse.json({
        success: false,
        message: "Pinterest not configured (missing token or board id)",
      });
    }

    const log = await loadLog();
    const alreadyPinned = new Set(log.map((e) => e.key));

    const queue = await buildQueue();
    const toPin = queue
      .filter((c) => !alreadyPinned.has(c.key))
      .slice(0, MAX_PINS_PER_RUN);

    if (toPin.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No fresh assets to pin (all caught up)",
        queueSize: queue.length,
      });
    }

    const newEntries: PinLogEntry[] = [];
    const results: { key: string; status: string }[] = [];

    for (let i = 0; i < toPin.length; i++) {
      const c = toPin[i];
      const r = await pinToPinterest({
        title: c.title,
        description: c.description,
        link: c.link,
        imageUrl: c.imageUrl,
      });

      results.push({ key: c.key, status: r.status + (r.message ? `: ${r.message}` : "") });

      if (r.status === "success") {
        newEntries.push({
          key: c.key,
          slug: c.slug,
          kind: c.kind,
          title: c.title,
          link: c.link,
          imageUrl: c.imageUrl,
          pinnedAt: new Date().toISOString(),
        });
      }

      // Space pins out so the account doesn't look botty
      if (i < toPin.length - 1) {
        await new Promise((res) => setTimeout(res, 3000 + Math.random() * 3000));
      }
    }

    if (newEntries.length > 0) {
      try {
        await saveLog(newEntries);
      } catch (err) {
        console.error("[pinterest-pin] Failed to save log:", err);
      }

      await sendTelegramReport(
        [
          `📌 *Pinterest Pins*`,
          ``,
          ...newEntries.map((e) => `• ${e.kind}: ${e.title.slice(0, 50)}`),
          ``,
          `_${newEntries.length} pinned, ${queue.length} total in queue_`,
        ].join("\n")
      );
    }

    return NextResponse.json({
      success: true,
      pinned: newEntries.length,
      queueSize: queue.length,
      results,
    });
  } catch (err: unknown) {
    console.error("[pinterest-pin] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
