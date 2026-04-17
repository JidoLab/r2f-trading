/**
 * Syndication orchestrator — publishes a new blog post to Dev.to + Hashnode
 * and generates Medium import instructions.
 *
 * Safety: platform failures are isolated. If one fails, others still try.
 * Result logged to GitHub at data/syndication-log.json (append-only).
 */

import { publishToDevto, isDevtoEnabled } from "./devto";
import { publishToHashnode, isHashnodeEnabled } from "./hashnode";
import { generateMediumImportInstructions } from "./medium";
import { readFile, commitFile } from "@/lib/github";

export interface SyndicatePostParams {
  slug: string;
  title: string;
  excerpt?: string;
  bodyMarkdown: string;
  coverImageUrl?: string;
  tags?: string[];
}

export interface PlatformResult {
  platform: "devto" | "hashnode" | "medium";
  success: boolean;
  url?: string;
  id?: string;
  error?: string;
}

export interface SyndicateResult {
  slug: string;
  syndicatedAt: string;
  canonicalUrl: string;
  platforms: PlatformResult[];
  mediumImportUrl?: string; // for manual click-to-import
}

const SITE_URL = "https://www.r2ftrading.com";
const BLOG_PATH_PREFIX = "/trading-insights";

/**
 * Build a canonical note to prepend to syndicated post body.
 * Tells readers (and signals to platforms) this is a republish with SEO pointing back.
 */
function buildCanonicalNote(slug: string, title: string): string {
  const canonical = `${SITE_URL}${BLOG_PATH_PREFIX}/${slug}`;
  return `*This post was originally published at [R2F Trading](${canonical}). Republished here with canonical link intact.*\n\n---\n\n`;
}

/**
 * Publish a blog post to all configured syndication platforms.
 * Returns result for each platform. Never throws — always resolves.
 */
export async function syndicatePost(params: SyndicatePostParams): Promise<SyndicateResult> {
  const canonicalUrl = `${SITE_URL}${BLOG_PATH_PREFIX}/${params.slug}`;
  const canonicalNote = buildCanonicalNote(params.slug, params.title);
  const bodyWithCanonical = canonicalNote + params.bodyMarkdown;

  const platforms: PlatformResult[] = [];

  // Dev.to
  if (isDevtoEnabled()) {
    try {
      const result = await publishToDevto({
        title: params.title,
        bodyMarkdown: bodyWithCanonical,
        canonicalUrl,
        description: params.excerpt,
        coverImageUrl: params.coverImageUrl,
        tags: params.tags,
      });
      platforms.push({
        platform: "devto",
        success: result.success,
        url: result.url,
        id: result.id !== undefined ? String(result.id) : undefined,
        error: result.error,
      });
    } catch (err) {
      platforms.push({
        platform: "devto",
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Hashnode
  if (isHashnodeEnabled()) {
    try {
      const result = await publishToHashnode({
        title: params.title,
        contentMarkdown: bodyWithCanonical,
        canonicalUrl,
        subtitle: params.excerpt,
        coverImageUrl: params.coverImageUrl,
        tags: params.tags,
      });
      platforms.push({
        platform: "hashnode",
        success: result.success,
        url: result.url,
        id: result.id,
        error: result.error,
      });
    } catch (err) {
      platforms.push({
        platform: "hashnode",
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Medium (always generates instructions since no API)
  const mediumInstructions = generateMediumImportInstructions(canonicalUrl);
  platforms.push({
    platform: "medium",
    success: true, // always "success" because we're providing an import link, not publishing
    url: mediumInstructions.mediumImportPageUrl,
  });

  const result: SyndicateResult = {
    slug: params.slug,
    syndicatedAt: new Date().toISOString(),
    canonicalUrl,
    platforms,
    mediumImportUrl: mediumInstructions.importUrl,
  };

  // Log to GitHub (best-effort)
  try {
    await appendToSyndicationLog(result);
  } catch {
    // Don't fail syndication if log write fails
  }

  return result;
}

/**
 * Append a syndication result to the log file on GitHub.
 */
async function appendToSyndicationLog(result: SyndicateResult): Promise<void> {
  const path = "data/syndication-log.json";
  let log: SyndicateResult[] = [];
  try {
    const raw = await readFile(path);
    log = JSON.parse(raw);
    if (!Array.isArray(log)) log = [];
  } catch {
    // File doesn't exist yet — start empty
  }

  log.unshift(result); // newest first
  log = log.slice(0, 200); // keep last 200 entries

  await commitFile(path, JSON.stringify(log, null, 2), `syndication: ${result.slug}`);
}

/**
 * Format a syndication result for Telegram message.
 */
export function formatSyndicationTelegramMessage(result: SyndicateResult): string {
  const lines: string[] = [`📢 Syndicated: ${result.slug}`];

  for (const p of result.platforms) {
    const icon = p.success ? "✅" : "❌";
    if (p.platform === "medium") {
      lines.push(`${icon} Medium: click to import → ${p.url}?url=${encodeURIComponent(result.mediumImportUrl || "")}`);
    } else if (p.success && p.url) {
      lines.push(`${icon} ${p.platform}: ${p.url}`);
    } else {
      lines.push(`${icon} ${p.platform}: ${p.error || "no url"}`);
    }
  }

  return lines.join("\n");
}

export function getEnabledSyndicationPlatforms(): string[] {
  const enabled: string[] = [];
  if (isDevtoEnabled()) enabled.push("devto");
  if (isHashnodeEnabled()) enabled.push("hashnode");
  enabled.push("medium"); // always enabled (manual import)
  return enabled;
}
