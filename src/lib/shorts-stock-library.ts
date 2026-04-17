/**
 * Stock video library for Shorts — now data-driven instead of hardcoded.
 *
 * Library stored at data/shorts/stock-library.json and expanded via
 * /api/admin/shorts/expand-stock-library using the Pexels API.
 *
 * Usage tracking (per clip) lets the renderer pick least-used clips first,
 * preventing repetition and creating data to analyze later.
 */

import { readFile, commitFile } from "@/lib/github";

export interface StockClip {
  id: string;
  url: string;
  category: string;
  width?: number;
  height?: number;
  duration?: number;
  pexelsId?: number;
  usageCount: number;
  lastUsedAt?: string;
  addedAt: string;
}

const LIBRARY_PATH = "data/shorts/stock-library.json";

// Seed data — used on first load when the library JSON doesn't exist yet.
// Mirrors the legacy hardcoded STOCK_LIBRARY.
const SEED: Record<string, string[]> = {
  frustration: [
    "https://videos.pexels.com/video-files/18503891/18503891-hd_1080_1920_30fps.mp4",
    "https://videos.pexels.com/video-files/8530543/8530543-hd_1080_2048_25fps.mp4",
    "https://videos.pexels.com/video-files/8873041/8873041-hd_1080_1920_25fps.mp4",
  ],
  thinking: [
    "https://videos.pexels.com/video-files/8226005/8226005-hd_1080_1920_25fps.mp4",
    "https://videos.pexels.com/video-files/7924472/7924472-hd_1080_1920_24fps.mp4",
    "https://videos.pexels.com/video-files/8555748/8555748-hd_1080_1920_24fps.mp4",
  ],
  surprise: [
    "https://videos.pexels.com/video-files/8627749/8627749-hd_1080_1920_25fps.mp4",
    "https://videos.pexels.com/video-files/6657887/6657887-hd_1080_1920_30fps.mp4",
    "https://videos.pexels.com/video-files/18503908/18503908-hd_1080_1920_30fps.mp4",
  ],
  screen_glow: [
    "https://videos.pexels.com/video-files/8480680/8480680-hd_1080_1920_25fps.mp4",
    "https://videos.pexels.com/video-files/8480278/8480278-hd_1080_1920_25fps.mp4",
  ],
  lightbulb: [
    "https://videos.pexels.com/video-files/9196607/9196607-hd_1080_2048_25fps.mp4",
    "https://videos.pexels.com/video-files/5647316/5647316-hd_1080_1920_25fps.mp4",
    "https://videos.pexels.com/video-files/5094588/5094588-hd_1080_2048_25fps.mp4",
  ],
  typing_trade: [
    "https://videos.pexels.com/video-files/6963412/6963412-hd_1080_1920_30fps.mp4",
    "https://videos.pexels.com/video-files/8873184/8873184-hd_1080_1920_25fps.mp4",
    "https://videos.pexels.com/video-files/7546674/7546674-hd_1080_1920_25fps.mp4",
  ],
  celebration: [
    "https://videos.pexels.com/video-files/6532231/6532231-hd_1080_1920_30fps.mp4",
    "https://videos.pexels.com/video-files/7165664/7165664-hd_1080_1920_25fps.mp4",
    "https://videos.pexels.com/video-files/7842360/7842360-hd_1080_1920_30fps.mp4",
  ],
  walking_city: [
    "https://videos.pexels.com/video-files/8394092/8394092-hd_1080_1920_24fps.mp4",
    "https://videos.pexels.com/video-files/8151972/8151972-hd_1080_1920_30fps.mp4",
  ],
  phone_chart: [
    "https://videos.pexels.com/video-files/7580285/7580285-hd_1080_2048_25fps.mp4",
    "https://videos.pexels.com/video-files/7691557/7691557-hd_1080_1920_25fps.mp4",
    "https://videos.pexels.com/video-files/7989855/7989855-hd_1080_1920_25fps.mp4",
  ],
  focus_intense: [
    "https://videos.pexels.com/video-files/9945187/9945187-hd_1080_1920_24fps.mp4",
    "https://videos.pexels.com/video-files/9945196/9945196-hd_1080_1920_24fps.mp4",
    "https://videos.pexels.com/video-files/9943349/9943349-hd_1080_1920_24fps.mp4",
  ],
  money: [
    "https://videos.pexels.com/video-files/6266430/6266430-hd_1080_1920_25fps.mp4",
    "https://videos.pexels.com/video-files/6326861/6326861-hd_1080_2048_25fps.mp4",
    "https://videos.pexels.com/video-files/6266251/6266251-hd_1080_1920_25fps.mp4",
  ],
  defeat: [
    "https://videos.pexels.com/video-files/7350231/7350231-hd_1080_1920_25fps.mp4",
    "https://videos.pexels.com/video-files/7924956/7924956-hd_1080_1920_24fps.mp4",
    "https://videos.pexels.com/video-files/7924517/7924517-hd_1080_1920_24fps.mp4",
  ],
  agreement: [
    "https://videos.pexels.com/video-files/7735910/7735910-hd_1080_1920_25fps.mp4",
    "https://videos.pexels.com/video-files/7953586/7953586-hd_1080_1920_30fps.mp4",
    "https://videos.pexels.com/video-files/8731519/8731519-hd_1080_1920_25fps.mp4",
  ],
  luxury: [
    "https://videos.pexels.com/video-files/28408297/12377001_1080_1920_29fps.mp4",
    "https://videos.pexels.com/video-files/35412849/15004256_1080_1920_30fps.mp4",
  ],
  morning: [
    "https://videos.pexels.com/video-files/27917231/12262914_1080_1920_60fps.mp4",
  ],
  pointing: [
    "https://videos.pexels.com/video-files/7414131/7414131-hd_1080_1920_24fps.mp4",
    "https://videos.pexels.com/video-files/5897669/5897669-hd_1080_1920_24fps.mp4",
    "https://videos.pexels.com/video-files/5904539/5904539-hd_1080_1920_24fps.mp4",
  ],
};

/**
 * Category → Pexels search query. Used by expansion endpoint to fetch
 * fresh clips for each category.
 */
export const PEXELS_QUERIES: Record<string, string> = {
  frustration: "frustrated stressed person",
  thinking: "person thinking contemplating",
  surprise: "shocked surprised reaction",
  screen_glow: "computer screen close up",
  lightbulb: "idea lightbulb moment",
  typing_trade: "typing keyboard hands close up",
  celebration: "celebration success happy",
  walking_city: "walking city street urban",
  phone_chart: "stock chart phone finance",
  focus_intense: "focused intense concentration",
  money: "cash money counting",
  defeat: "disappointed defeated head in hands",
  agreement: "nodding agreement handshake",
  luxury: "luxury lifestyle sunset",
  morning: "morning coffee routine",
  pointing: "pointing at screen explaining",
};

// ─── Load ──────────────────────────────────────────────────────────────

function seedClips(): StockClip[] {
  const now = new Date().toISOString();
  const clips: StockClip[] = [];
  for (const [cat, urls] of Object.entries(SEED)) {
    for (const url of urls) {
      const pexelsId = (url.match(/\/(\d+)\//) || [])[1];
      clips.push({
        id: `seed-${cat}-${pexelsId || clips.length}`,
        url,
        category: cat,
        pexelsId: pexelsId ? parseInt(pexelsId, 10) : undefined,
        usageCount: 0,
        addedAt: now,
      });
    }
  }
  return clips;
}

export async function loadStockLibrary(): Promise<StockClip[]> {
  try {
    const raw = await readFile(LIBRARY_PATH);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedClips();
  } catch {
    return seedClips();
  }
}

async function saveStockLibrary(clips: StockClip[], message: string): Promise<void> {
  await commitFile(LIBRARY_PATH, JSON.stringify(clips, null, 2), message);
}

// ─── Selection (with usage tracking) ───────────────────────────────────

/**
 * Pick the best clip for a category, preferring least-used + not-in-this-render.
 * Returns null if no clip available.
 */
export async function pickStockClip(
  category: string,
  excludeUrls: Set<string>,
  library?: StockClip[],
): Promise<StockClip | null> {
  const clips = library || (await loadStockLibrary());
  const categoryClips = clips.filter((c) => c.category === category);
  if (categoryClips.length === 0) return null;

  const available = categoryClips.filter((c) => !excludeUrls.has(c.url));
  if (available.length === 0) {
    // All used in this render — just pick random from category
    return categoryClips[Math.floor(Math.random() * categoryClips.length)];
  }

  // Sort by usage count (ascending), then by last-used recency (oldest first)
  available.sort((a, b) => {
    const usageDiff = (a.usageCount || 0) - (b.usageCount || 0);
    if (usageDiff !== 0) return usageDiff;
    const aLast = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
    const bLast = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
    return aLast - bLast;
  });

  // Pick from bottom quartile (least used) with some randomness
  const poolSize = Math.max(1, Math.floor(available.length / 4));
  const pool = available.slice(0, poolSize);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Increment usage count + set lastUsedAt. Best-effort, non-blocking.
 * Batches updates in-memory then writes once per call for efficiency.
 */
export async function trackStockUsage(clipIds: string[]): Promise<void> {
  if (clipIds.length === 0) return;
  try {
    const clips = await loadStockLibrary();
    const now = new Date().toISOString();
    let changed = false;
    for (const id of clipIds) {
      const idx = clips.findIndex((c) => c.id === id);
      if (idx >= 0) {
        clips[idx].usageCount = (clips[idx].usageCount || 0) + 1;
        clips[idx].lastUsedAt = now;
        changed = true;
      }
    }
    if (changed) {
      await saveStockLibrary(clips, `chore: stock usage +${clipIds.length}`);
    }
  } catch {
    // ignore
  }
}

// ─── Pexels expansion ──────────────────────────────────────────────────

interface PexelsVideoFile {
  link: string;
  width: number;
  height: number;
  fps?: number;
}

interface PexelsVideo {
  id: number;
  duration: number;
  width: number;
  height: number;
  video_files: PexelsVideoFile[];
}

/**
 * Fetch fresh clips for a category from Pexels. Adds them to the library
 * if they're portrait (9:16) and not already present.
 *
 * Returns a summary of what was added.
 */
export async function expandCategoryFromPexels(
  category: string,
  count: number = 10,
): Promise<{ category: string; added: number; total: number; error?: string }> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return { category, added: 0, total: 0, error: "PEXELS_API_KEY not set" };

  const query = PEXELS_QUERIES[category];
  if (!query) return { category, added: 0, total: 0, error: `Unknown category: ${category}` };

  try {
    const perPage = Math.min(count * 3, 80); // request extra — we filter heavily
    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(
      query,
    )}&per_page=${perPage}&orientation=portrait&size=medium`;
    const res = await fetch(url, { headers: { Authorization: apiKey } });
    if (!res.ok) {
      return {
        category,
        added: 0,
        total: 0,
        error: `Pexels HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
      };
    }
    const data = (await res.json()) as { videos?: PexelsVideo[] };
    const videos = data.videos || [];

    const library = await loadStockLibrary();
    const existingUrls = new Set(library.map((c) => c.url));
    const now = new Date().toISOString();
    let added = 0;

    for (const v of videos) {
      if (added >= count) break;
      // Pick the best portrait HD file — prefer 1080x1920 or 1080x2048 around 25-30fps
      const portraitFiles = (v.video_files || []).filter((f) => f.height > f.width);
      if (portraitFiles.length === 0) continue;
      // Sort by height (prefer closer to 1920)
      portraitFiles.sort((a, b) => Math.abs(1920 - a.height) - Math.abs(1920 - b.height));
      const best = portraitFiles[0];
      if (!best || existingUrls.has(best.link)) continue;

      library.push({
        id: `pexels-${v.id}`,
        url: best.link,
        category,
        width: best.width,
        height: best.height,
        duration: v.duration,
        pexelsId: v.id,
        usageCount: 0,
        addedAt: now,
      });
      existingUrls.add(best.link);
      added++;
    }

    if (added > 0) {
      await saveStockLibrary(library, `shorts: expand library ${category} +${added}`);
    }

    return {
      category,
      added,
      total: library.filter((c) => c.category === category).length,
    };
  } catch (err) {
    return {
      category,
      added: 0,
      total: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Get library stats for admin dashboard.
 */
export async function getLibraryStats(): Promise<{
  total: number;
  byCategory: Record<string, { count: number; totalUsage: number }>;
  topUsed: StockClip[];
  leastUsed: StockClip[];
}> {
  const clips = await loadStockLibrary();
  const byCategory: Record<string, { count: number; totalUsage: number }> = {};
  for (const c of clips) {
    if (!byCategory[c.category]) byCategory[c.category] = { count: 0, totalUsage: 0 };
    byCategory[c.category].count++;
    byCategory[c.category].totalUsage += c.usageCount || 0;
  }
  const sorted = [...clips].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  return {
    total: clips.length,
    byCategory,
    topUsed: sorted.slice(0, 10),
    leastUsed: sorted.slice(-10).reverse(),
  };
}
