/**
 * Match Shorts scenes to images in the rich image library
 * (data/image-library-full.json — uploaded via /admin/image-library).
 *
 * Scoring heuristic: pattern match (highest weight) > tag match > description
 * token overlap. Tracks usage count so recently-used images are penalized.
 */

import { readFile, commitFile } from "@/lib/github";

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

const LIBRARY_PATH = "data/image-library-full.json";

async function loadLibrary(): Promise<LibraryImage[]> {
  try {
    const raw = await readFile(LIBRARY_PATH);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function scoreImage(img: LibraryImage, queryTokens: string[], scriptTokens: Set<string>): number {
  let score = 0;

  // Pattern match: high weight (these are the core ICT concepts)
  for (const pattern of img.patterns) {
    const ptokens = tokenize(pattern);
    let patternMatch = 0;
    for (const pt of ptokens) {
      if (queryTokens.includes(pt)) patternMatch++;
      else if (scriptTokens.has(pt)) patternMatch += 0.5;
    }
    // Bonus if all pattern tokens matched (fully intent-matching pattern)
    if (patternMatch >= ptokens.length && ptokens.length > 0) score += 15;
    else score += patternMatch * 6;
  }

  // Tag match
  for (const tag of img.tags) {
    const ttokens = tokenize(tag);
    for (const tt of ttokens) {
      if (queryTokens.includes(tt)) score += 4;
      else if (scriptTokens.has(tt)) score += 1.5;
    }
  }

  // Description token overlap
  const dtokens = tokenize(img.description);
  for (const dt of dtokens) {
    if (queryTokens.includes(dt)) score += 2;
    else if (scriptTokens.has(dt)) score += 0.5;
  }

  // Penalize frequently-used images (diversity)
  const usagePenalty = Math.min(img.usageCount * 0.5, 10);
  score -= usagePenalty;

  return score;
}

/**
 * Find the best matching library image for a Shorts scene.
 * Returns null if no image scores above the quality threshold.
 *
 * @param visualQuery - scene.visualQuery from Claude-generated script
 * @param scriptContext - full script text (used for secondary context matching)
 * @param excludeUrls - already-used URLs in this video (avoid reuse)
 */
export async function findBestImageMatch(
  visualQuery: string,
  scriptContext: string,
  excludeUrls: Set<string> = new Set(),
): Promise<LibraryImage | null> {
  const library = await loadLibrary();
  if (library.length === 0) return null;

  const queryTokens = tokenize(visualQuery);
  const scriptTokens = new Set(tokenize(scriptContext));

  const candidates = library
    .filter((img) => !excludeUrls.has(img.url))
    .map((img) => ({ img, score: scoreImage(img, queryTokens, scriptTokens) }))
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return null;
  const best = candidates[0];

  // Require a minimum score so we don't match random images
  const MIN_SCORE = 4;
  if (best.score < MIN_SCORE) return null;

  return best.img;
}

/**
 * Increment usage count for an image. Best-effort — failures are swallowed so
 * the Shorts pipeline never breaks on tracking errors.
 */
export async function incrementImageUsage(imageId: string): Promise<void> {
  try {
    const library = await loadLibrary();
    const idx = library.findIndex((img) => img.id === imageId);
    if (idx < 0) return;
    library[idx].usageCount = (library[idx].usageCount || 0) + 1;
    await commitFile(LIBRARY_PATH, JSON.stringify(library, null, 2), `chore: image usage +1 ${imageId}`);
  } catch {
    // Ignore — usage tracking is a nice-to-have
  }
}

/**
 * Get a compact list of available patterns + tags for Claude prompts.
 * Lets the script generator use terms that will actually match images.
 */
export async function getLibraryTaxonomy(): Promise<{
  patterns: string[];
  tags: string[];
  imageCount: number;
}> {
  const library = await loadLibrary();
  const patterns = [...new Set(library.flatMap((img) => img.patterns))].slice(0, 30);
  const tags = [...new Set(library.flatMap((img) => img.tags))].slice(0, 30);
  return { patterns, tags, imageCount: library.length };
}
