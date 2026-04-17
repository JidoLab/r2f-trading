/**
 * Medium syndication — no official API for posting (Medium killed it in 2024).
 *
 * Strategy: Generate a prefilled Medium Import URL. Harvest clicks once in Telegram
 * alert → Medium imports the post automatically (with canonical link back).
 *
 * Medium Import tool: https://medium.com/p/import
 * When you paste a URL, Medium fetches the page, creates a draft with:
 *  - Title + body from the page
 *  - Canonical link automatically set to the source URL (SEO-safe)
 *
 * Env vars:
 *   MEDIUM_USERNAME  — optional, used for display in admin UI only
 */

export interface MediumImportInstructions {
  importUrl: string; // URL to paste into Medium's importer
  mediumImportPageUrl: string; // where to go to paste it
  canonicalUrl: string;
}

export function generateMediumImportInstructions(blogUrl: string): MediumImportInstructions {
  return {
    importUrl: blogUrl,
    mediumImportPageUrl: "https://medium.com/p/import",
    canonicalUrl: blogUrl,
  };
}

export function isMediumEnabled(): boolean {
  // Always enabled as long as the blog URL exists — Medium import is manual but
  // we still generate the instructions/link so Harvest can one-click syndicate.
  return true;
}
