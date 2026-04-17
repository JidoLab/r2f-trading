/**
 * Substack API client — unofficial
 *
 * Uses reverse-engineered endpoints (no official API for publishing).
 * Auth via session cookie (substack.sid). Cookie can expire/be revoked at any time.
 *
 * Env vars required:
 *   SUBSTACK_SESSION_COOKIE   — value of substack.sid cookie from logged-in browser
 *   SUBSTACK_PUBLICATION_URL  — e.g., https://harvestwright.substack.com (no trailing slash)
 *   SUBSTACK_USER_ID          — your numeric user ID on Substack (discoverable via test endpoint)
 *
 * Creates DRAFTS only — never auto-publishes. User reviews + publishes manually.
 */

// ─── TipTap JSON builder ────────────────────────────────────────────────

interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

interface TipTapDoc {
  type: "doc";
  content: TipTapNode[];
}

/**
 * Convert markdown/MDX body to Substack TipTap JSON.
 * Supports: headings, paragraphs, bold, italic, links, blockquotes, images, lists.
 * Does NOT strip MDX-specific exports (caller should pass body only, not metadata).
 */
export function markdownToTipTap(markdown: string): TipTapDoc {
  // Strip any "export const metadata = { ... }" block
  const cleaned = markdown.replace(/export\s+const\s+metadata\s*=\s*\{[\s\S]*?\n\}\s*\n?/, "").trim();

  const lines = cleaned.split("\n");
  const content: TipTapNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Heading: # Title, ## Heading, ### Subheading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      content.push({
        type: "heading",
        attrs: { level: Math.min(level, 3) }, // Substack supports h1-h3
        content: parseInline(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Blockquote: > text (multi-line)
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      content.push({
        type: "blockquote",
        content: [{
          type: "paragraph",
          content: parseInline(quoteLines.join(" ")),
        }],
      });
      continue;
    }

    // Image: ![alt](url)
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      content.push({
        type: "captionedImage",
        content: [{
          type: "image2",
          attrs: {
            src: imageMatch[2],
            height: null,
            width: null,
            resizeWidth: null,
            bytes: null,
            alt: imageMatch[1] || null,
            title: null,
            type: null,
            href: null,
            belowTheFold: false,
            topImage: false,
            fullscreen: false,
            imageSize: "normal",
          },
        }],
      });
      i++;
      continue;
    }

    // Unordered list: - item or * item
    if (/^[-*]\s+/.test(trimmed)) {
      const items: TipTapNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*]\s+/, "");
        items.push({
          type: "listItem",
          content: [{
            type: "paragraph",
            content: parseInline(itemText),
          }],
        });
        i++;
      }
      content.push({ type: "bulletList", content: items });
      continue;
    }

    // Ordered list: 1. item
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: TipTapNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, "");
        items.push({
          type: "listItem",
          content: [{
            type: "paragraph",
            content: parseInline(itemText),
          }],
        });
        i++;
      }
      content.push({ type: "orderedList", content: items });
      continue;
    }

    // Horizontal rule: ---
    if (/^-{3,}$/.test(trimmed)) {
      content.push({ type: "horizontal_rule" });
      i++;
      continue;
    }

    // Default: paragraph (collect until blank line)
    const paragraphLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !lines[i].trim().match(/^(#{1,6}\s|>|!\[|[-*]\s|\d+\.\s|-{3,}$)/)) {
      paragraphLines.push(lines[i]);
      i++;
    }
    const paragraphText = paragraphLines.join(" ").trim();
    if (paragraphText) {
      content.push({
        type: "paragraph",
        content: parseInline(paragraphText),
      });
    }
  }

  return { type: "doc", content };
}

/**
 * Parse inline markdown (bold, italic, links) into TipTap text nodes.
 */
function parseInline(text: string): TipTapNode[] {
  const nodes: TipTapNode[] = [];
  let remaining = text;

  // Regex matches: **bold**, *italic*, [text](url)
  const pattern = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))/;

  while (remaining.length > 0) {
    const match = remaining.match(pattern);
    if (!match || match.index === undefined) {
      nodes.push({ type: "text", text: remaining });
      break;
    }

    // Plain text before the match
    if (match.index > 0) {
      nodes.push({ type: "text", text: remaining.slice(0, match.index) });
    }

    // The matched formatting
    if (match[1]) {
      // **bold**
      nodes.push({
        type: "text",
        text: match[2],
        marks: [{ type: "strong" }],
      });
    } else if (match[3]) {
      // *italic*
      nodes.push({
        type: "text",
        text: match[4],
        marks: [{ type: "em" }],
      });
    } else if (match[5]) {
      // [text](url)
      nodes.push({
        type: "text",
        text: match[6],
        marks: [{
          type: "link",
          attrs: { href: match[7], target: "_blank" },
        }],
      });
    }

    remaining = remaining.slice(match.index + match[0].length);
  }

  return nodes.length > 0 ? nodes : [{ type: "text", text }];
}

// ─── API client ────────────────────────────────────────────────────────

interface SubstackConfig {
  sessionCookie: string;
  publicationUrl: string;
  userId: number;
}

function getConfig(): SubstackConfig | null {
  const sessionCookie = process.env.SUBSTACK_SESSION_COOKIE;
  const publicationUrl = (process.env.SUBSTACK_PUBLICATION_URL || "").replace(/\/$/, "");
  const userId = parseInt(process.env.SUBSTACK_USER_ID || "0", 10);

  if (!sessionCookie || !publicationUrl || !userId) return null;

  return { sessionCookie, publicationUrl, userId };
}

function substackHeaders(sessionCookie: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    Cookie: `substack.sid=${sessionCookie}`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
    ...extra,
  };
}

/**
 * Test connection — verifies auth by hitting the publication-scoped drafts endpoint.
 * If we can list drafts with the cookie, we can create them.
 * Also fetches publication name for display.
 */
export async function testSubstackConnection(): Promise<{ ok: boolean; userId?: number; name?: string; email?: string; publicationName?: string; error?: string }> {
  const sessionCookie = process.env.SUBSTACK_SESSION_COOKIE;
  const publicationUrl = (process.env.SUBSTACK_PUBLICATION_URL || "").replace(/\/$/, "");
  const userId = parseInt(process.env.SUBSTACK_USER_ID || "0", 10);

  if (!sessionCookie) return { ok: false, error: "SUBSTACK_SESSION_COOKIE not set" };
  if (!publicationUrl) return { ok: false, error: "SUBSTACK_PUBLICATION_URL not set" };

  try {
    // Primary test: list drafts (the actual capability we need)
    const res = await fetch(`${publicationUrl}/api/v1/drafts?limit=1`, {
      headers: substackHeaders(sessionCookie),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `HTTP ${res.status} on /api/v1/drafts: ${errText.slice(0, 200)}` };
    }

    // Secondary: fetch publication info for display (best-effort)
    let publicationName: string | undefined;
    try {
      const pubRes = await fetch(`${publicationUrl}/api/v1/publication`, {
        headers: substackHeaders(sessionCookie),
      });
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        publicationName = pubData.name || pubData.publication_name || pubData.display_name;
      }
    } catch {
      // Ignore — not critical
    }

    return {
      ok: true,
      userId: userId || undefined,
      name: publicationName,
      publicationName,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Create a Substack draft from blog content.
 * Returns the draft ID and admin URL on success.
 */
export async function createSubstackDraft(params: {
  title: string;
  subtitle: string;
  bodyMarkdown: string;
  coverImageUrl?: string;
}): Promise<{ success: boolean; draftId?: string; draftUrl?: string; error?: string }> {
  const config = getConfig();
  if (!config) {
    return { success: false, error: "Substack not configured (missing env vars)" };
  }

  try {
    // Convert markdown to TipTap JSON
    const tiptapDoc = markdownToTipTap(params.bodyMarkdown);

    // Build request body per Substack's internal API format
    const body: Record<string, unknown> = {
      draft_title: params.title.slice(0, 140),
      draft_subtitle: params.subtitle.slice(0, 280),
      draft_body: JSON.stringify(tiptapDoc),
      draft_bylines: [{ id: config.userId, is_guest: false }],
      audience: "everyone",
      write_comment_permissions: "everyone",
      section_chosen: false,
    };

    if (params.coverImageUrl) {
      body.cover_image = params.coverImageUrl;
    }

    const res = await fetch(`${config.publicationUrl}/api/v1/drafts`, {
      method: "POST",
      headers: substackHeaders(config.sessionCookie, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${errText.slice(0, 300)}` };
    }

    const data = await res.json();
    const draftId = data.id || data.draft_id || data.post_id;

    return {
      success: true,
      draftId: String(draftId),
      draftUrl: `${config.publicationUrl}/publish/post/${draftId}`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Check if Substack integration is configured and enabled.
 */
export function isSubstackEnabled(): boolean {
  return getConfig() !== null;
}
