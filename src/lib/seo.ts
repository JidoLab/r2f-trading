/**
 * Shared SEO title/description formatting.
 *
 * The root layout sets `title.template = "%s | R2F Trading"`, so any page that
 * returns a plain string title gets the brand appended automatically. That was
 * pushing most titles past Google's ~60 character display limit, so the part of
 * the headline that earns the click was being truncated in the SERP. Some stored
 * seoTitle values also already ended in "| R2F Trading", which produced a visible
 * double suffix.
 *
 * seoTitle() returns an `absolute` title (bypassing the template) with the brand
 * appended only when the result still fits.
 */

const BRAND_SUFFIX = " | R2F Trading";
const MAX_TITLE = 60;
const MAX_DESCRIPTION = 158;

/** Remove a trailing "| R2F Trading" (any spacing/casing) so it is never doubled. */
function stripBrand(raw: string): string {
  return raw.replace(/\s*[|·–-]\s*R2F\s*Trading\s*$/i, "").trim();
}

/**
 * Build a SERP-safe title. Returns an absolute title so the root layout template
 * does not append the brand a second time.
 */
export function seoTitle(raw: string): { absolute: string } {
  const base = stripBrand((raw || "").replace(/\s+/g, " ").trim());
  const withBrand = base + BRAND_SUFFIX;
  return { absolute: withBrand.length <= MAX_TITLE ? withBrand : base };
}

/** Clamp a meta description to what Google actually renders, cutting on a word boundary. */
export function seoDescription(raw: string): string {
  const text = (raw || "").replace(/\s+/g, " ").trim();
  if (text.length <= MAX_DESCRIPTION) return text;

  const cut = text.slice(0, MAX_DESCRIPTION);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > MAX_DESCRIPTION * 0.6 ? cut.slice(0, lastSpace) : cut;
  return trimmed.replace(/[\s,;:.!?-]+$/, "") + "...";
}
