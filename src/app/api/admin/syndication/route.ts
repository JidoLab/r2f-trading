import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { testDevtoConnection, isDevtoEnabled } from "@/lib/syndication/devto";
import {
  testHashnodeConnection,
  discoverPublicationId,
  isHashnodeEnabled,
} from "@/lib/syndication/hashnode";
import { syndicatePost } from "@/lib/syndication";
import { readFile } from "@/lib/github";

export const maxDuration = 60;

/**
 * GET — Status dashboard: connection tests, env var checks, recent log
 * GET ?discover=hashnode — discover publicationId using just API key (setup helper)
 * POST — Manually syndicate an existing blog post by slug
 */

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  // Setup helper: discover Hashnode publicationId
  if (searchParams.get("discover") === "hashnode") {
    const discovery = await discoverPublicationId();
    return NextResponse.json(discovery);
  }

  // Status check for all platforms
  // For Hashnode: if we only have API key (not publication ID), run testHashnodeConnection
  // anyway — it handles the missing publication ID gracefully and this lets us distinguish
  // "need publication ID" from "invalid API key"
  const hasHashnodeApiKey = !!process.env.HASHNODE_API_KEY;
  const hasHashnodePubId = !!process.env.HASHNODE_PUBLICATION_ID;

  const [devtoTest, hashnodeTest] = await Promise.all([
    isDevtoEnabled() ? testDevtoConnection() : Promise.resolve({ ok: false, error: "API key not set" }),
    hasHashnodeApiKey
      ? testHashnodeConnection().then((r) =>
          !r.ok && !hasHashnodePubId
            ? { ok: false, error: "Publication ID not yet set — click Discover below" }
            : r,
        )
      : Promise.resolve({ ok: false, error: "API key not set" }),
  ]);

  // Recent syndication log
  let log: unknown[] = [];
  try {
    const raw = await readFile("data/syndication-log.json");
    log = JSON.parse(raw);
    if (!Array.isArray(log)) log = [];
  } catch {
    log = [];
  }

  return NextResponse.json({
    platforms: {
      devto: {
        configured: isDevtoEnabled(),
        hasApiKey: !!process.env.DEVTO_API_KEY,
        connection: devtoTest,
      },
      hashnode: {
        configured: isHashnodeEnabled(),
        hasApiKey: !!process.env.HASHNODE_API_KEY,
        hasPublicationId: !!process.env.HASHNODE_PUBLICATION_ID,
        connection: hashnodeTest,
      },
      medium: {
        configured: true,
        note: "Medium has no API. We generate a one-click import URL sent via Telegram.",
      },
    },
    recentLog: (log as { slug: string; syndicatedAt: string; platforms: unknown[] }[]).slice(0, 20),
  });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const slug = body.slug;
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  try {
    // Read the blog post from GitHub
    const mdxContent = await readFile(`content/blog/${slug}.mdx`);

    // Extract metadata
    const metaMatch = mdxContent.match(/export\s+const\s+metadata\s*=\s*(\{[\s\S]*?\n\})/);
    if (!metaMatch) {
      return NextResponse.json({ error: "Could not parse post metadata" }, { status: 500 });
    }
    const metadata = new Function(`return ${metaMatch[1]}`)() as {
      title: string;
      excerpt?: string;
      coverImage?: string;
      tags?: string[];
      category?: string;
    };

    // Get body after the metadata block
    const bodyStart = mdxContent.indexOf("\n}") + 2;
    const bodyMarkdown = mdxContent.slice(bodyStart).trim();

    // Absolute cover URL
    const coverImageUrl = metadata.coverImage?.startsWith("http")
      ? metadata.coverImage
      : metadata.coverImage
      ? `https://www.r2ftrading.com${metadata.coverImage}`
      : undefined;

    const tags = metadata.tags && metadata.tags.length > 0
      ? metadata.tags
      : metadata.category
      ? [metadata.category, "trading", "forex", "ict"]
      : ["trading", "forex", "ict"];

    const result = await syndicatePost({
      slug,
      title: metadata.title,
      excerpt: metadata.excerpt,
      bodyMarkdown,
      coverImageUrl,
      tags,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to syndicate" },
      { status: 500 },
    );
  }
}
