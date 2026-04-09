/**
 * Image Library — pick the best matching images for content generation.
 * Used by blog generation, shorts, and social posts.
 */

import { readFile, commitFile } from "./github";

export interface LibraryImage {
  id: string;
  filename: string;
  url: string;
  tags: string[];
  patterns: string[];
  category: string;
  description: string;
  pair?: string;
  timeframe?: string;
  addedAt: string;
  usageCount: number;
}

let _cache: LibraryImage[] | null = null;

async function loadLibrary(): Promise<LibraryImage[]> {
  if (_cache) return _cache;
  try {
    const raw = await readFile("data/image-library-full.json");
    _cache = JSON.parse(raw);
    return _cache!;
  } catch {
    return [];
  }
}

/**
 * Find the best matching images for a given topic/keyword set.
 * Returns up to `limit` images sorted by relevance score.
 */
export async function findMatchingImages(
  keywords: string[],
  options?: { category?: string; pair?: string; limit?: number }
): Promise<LibraryImage[]> {
  const images = await loadLibrary();
  if (images.length === 0) return [];

  const limit = options?.limit || 3;
  const lowerKeywords = keywords.map(k => k.toLowerCase());

  // Score each image by keyword match quality
  const scored = images.map(img => {
    let score = 0;

    // Pattern match (highest value — e.g. "order block" matches "order block")
    for (const pattern of img.patterns) {
      const lp = pattern.toLowerCase();
      for (const kw of lowerKeywords) {
        if (lp.includes(kw) || kw.includes(lp)) score += 10;
        // Partial word match
        const words = lp.split(/\s+/);
        for (const w of words) {
          if (kw.includes(w) && w.length > 3) score += 3;
        }
      }
    }

    // Tag match
    for (const tag of img.tags) {
      const lt = tag.toLowerCase();
      for (const kw of lowerKeywords) {
        if (lt === kw) score += 8;
        if (lt.includes(kw) || kw.includes(lt)) score += 4;
      }
    }

    // Description match
    const desc = img.description.toLowerCase();
    for (const kw of lowerKeywords) {
      if (desc.includes(kw)) score += 2;
    }

    // Category filter bonus
    if (options?.category && img.category === options.category) score += 3;

    // Pair match bonus
    if (options?.pair && img.pair?.toLowerCase() === options.pair.toLowerCase()) score += 5;

    // Prefer less-used images (freshness)
    if (img.usageCount === 0) score += 1;

    return { image: img, score };
  });

  // Sort by score descending, return top matches
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.image);
}

/**
 * Record that an image was used — increments usage count.
 */
export async function markImageUsed(imageId: string): Promise<void> {
  try {
    const images = await loadLibrary();
    const idx = images.findIndex(img => img.id === imageId);
    if (idx >= 0) {
      images[idx].usageCount++;
      _cache = images;
      await commitFile(
        "data/image-library-full.json",
        JSON.stringify(images, null, 2),
        `Image used: ${images[idx].description?.slice(0, 30) || imageId}`
      );
    }
  } catch {}
}

/**
 * Build a text summary of available images for the AI prompt.
 * This lets Claude know what chart images are available to reference.
 */
export async function getLibrarySummary(): Promise<string> {
  const images = await loadLibrary();
  if (images.length === 0) return "";

  const categories = [...new Set(images.map(img => img.category))];
  const lines: string[] = ["AVAILABLE CHART IMAGES (use these instead of generic descriptions):"];

  for (const cat of categories) {
    const catImages = images.filter(img => img.category === cat);
    lines.push(`\n[${cat.toUpperCase()}] (${catImages.length} images)`);
    for (const img of catImages.slice(0, 10)) {
      const pairInfo = img.pair ? ` (${img.pair}${img.timeframe ? ` ${img.timeframe}` : ""})` : "";
      lines.push(`  - ID:${img.id} — ${img.description}${pairInfo} — patterns: ${img.patterns.join(", ")}`);
    }
  }

  lines.push("\nTo use an image, include: ![alt text](LIBRARY:image_id) — it will be replaced with the actual URL.");
  return lines.join("\n");
}
