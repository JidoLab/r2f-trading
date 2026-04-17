/**
 * Dev.to (Forem) API client — auto-publish blog posts with canonical link back.
 * Docs: https://developers.forem.com/api/v1
 *
 * Env vars:
 *   DEVTO_API_KEY  — from dev.to → Settings → Extensions → DEV Community API Keys
 */

export interface DevToPublishParams {
  title: string;
  bodyMarkdown: string;
  canonicalUrl: string; // required for SEO — tells Google the original is on R2F
  tags?: string[]; // max 4, each alphanumeric + underscore only
  description?: string;
  coverImageUrl?: string;
}

export interface DevToPublishResult {
  success: boolean;
  url?: string;
  id?: number;
  error?: string;
}

export async function publishToDevto(
  params: DevToPublishParams,
): Promise<DevToPublishResult> {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) return { success: false, error: "DEVTO_API_KEY not set" };

  // Dev.to tags: lowercase, alphanumeric + underscore only, max 4
  const cleanedTags = (params.tags || [])
    .slice(0, 4)
    .map((t) => t.toLowerCase().replace(/[^a-z0-9_]/g, ""))
    .filter(Boolean);

  const body = {
    article: {
      title: params.title.slice(0, 128),
      body_markdown: params.bodyMarkdown,
      published: true,
      canonical_url: params.canonicalUrl,
      description: (params.description || "").slice(0, 160),
      tags: cleanedTags.join(", "), // comma-separated string, NOT array
      main_image: params.coverImageUrl,
    },
  };

  try {
    const res = await fetch("https://dev.to/api/articles", {
      method: "POST",
      headers: {
        "api-key": apiKey, // note: custom header, NOT Authorization
        "Content-Type": "application/json",
        Accept: "application/vnd.forem.api-v1+json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        error: `HTTP ${res.status}: ${errText.slice(0, 300)}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      url: data.url,
      id: data.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function testDevtoConnection(): Promise<{
  ok: boolean;
  username?: string;
  error?: string;
}> {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) return { ok: false, error: "DEVTO_API_KEY not set" };

  try {
    const res = await fetch("https://dev.to/api/users/me", {
      headers: { "api-key": apiKey },
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
    }
    const data = await res.json();
    return { ok: true, username: data.username };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function isDevtoEnabled(): boolean {
  return !!process.env.DEVTO_API_KEY;
}
