import { readFile, commitFile } from "./github";

/**
 * Background music library for shorts.
 *
 * Track URLs are direct MP3 links (typically from Pixabay — pixabay CDN URLs
 * are stable and their license allows commercial use without attribution).
 *
 * Ducking is handled by the DO renderer using sidechain compression — voice
 * always stays on top, music fills the gaps subtly.
 */

export type MusicMood = "hype" | "chill" | "cinematic" | "suspense" | "uplift";

export interface MusicTrack {
  id: string;
  url: string;
  name: string;
  mood: MusicMood;
  duration?: number; // seconds, optional
  enabled: boolean;
  addedAt: string; // ISO
  usageCount: number;
  lastUsedAt?: string; // ISO
}

export interface MusicLibrary {
  tracks: MusicTrack[];
  enabled: boolean; // master switch — if false, shorts render without music regardless of tracks
  baseVolumeDb: number; // default music volume floor (negative dB). Lower = quieter
  duckRatio: number; // sidechain compressor ratio. Higher = more aggressive duck
}

const LIB_PATH = "data/shorts/music-library.json";

const DEFAULT_LIB: MusicLibrary = {
  tracks: [],
  enabled: true,
  baseVolumeDb: -18, // subtle background level per Harvest's preference
  duckRatio: 8,
};

export async function loadMusicLibrary(): Promise<MusicLibrary> {
  try {
    const raw = await readFile(LIB_PATH);
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_LIB,
      ...parsed,
      tracks: Array.isArray(parsed.tracks) ? parsed.tracks : [],
    };
  } catch {
    return DEFAULT_LIB;
  }
}

export async function saveMusicLibrary(lib: MusicLibrary): Promise<void> {
  await commitFile(
    LIB_PATH,
    JSON.stringify(lib, null, 2),
    "chore(shorts-music): update library"
  );
}

/**
 * Pick a track for a new render. Uses weighted-random favoring least recently
 * used enabled tracks. Returns null if library is disabled or empty.
 */
export async function pickMusicTrack(
  preferredMood?: MusicMood
): Promise<MusicTrack | null> {
  const lib = await loadMusicLibrary();
  if (!lib.enabled) return null;

  let pool = lib.tracks.filter((t) => t.enabled);
  if (pool.length === 0) return null;

  // Prefer matching mood, fall back to all enabled
  if (preferredMood) {
    const filtered = pool.filter((t) => t.mood === preferredMood);
    if (filtered.length > 0) pool = filtered;
  }

  // Sort by least-recently-used, pick from the bottom 60% with random tiebreak
  const now = Date.now();
  const scored = pool.map((t) => {
    const lastMs = t.lastUsedAt ? new Date(t.lastUsedAt).getTime() : 0;
    const age = now - lastMs; // higher = less recently used
    return { track: t, score: age + Math.random() * 86400000 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].track;
}

/**
 * Called after a render starts using a track — bumps usage + lastUsedAt.
 * Fire-and-forget; failures shouldn't block a render.
 */
export async function trackMusicUsage(trackId: string): Promise<void> {
  try {
    const lib = await loadMusicLibrary();
    const t = lib.tracks.find((x) => x.id === trackId);
    if (!t) return;
    t.usageCount = (t.usageCount || 0) + 1;
    t.lastUsedAt = new Date().toISOString();
    await saveMusicLibrary(lib);
  } catch {
    // best-effort tracking
  }
}

export function normalizeTrackUrl(url: string): string {
  return url.trim().replace(/\?.*$/, ""); // strip query params that break stable IDs
}

export function newTrackId(url: string): string {
  const clean = normalizeTrackUrl(url);
  // Short hash from URL
  let h = 0;
  for (let i = 0; i < clean.length; i++) {
    h = (h * 31 + clean.charCodeAt(i)) | 0;
  }
  return `track-${Math.abs(h).toString(36)}`;
}
