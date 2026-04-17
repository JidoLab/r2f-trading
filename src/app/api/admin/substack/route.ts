import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { testSubstackConnection, createSubstackDraft, isSubstackEnabled } from "@/lib/substack";
import { readFile } from "@/lib/github";

export const maxDuration = 60;

/**
 * GET — Test Substack connection, report config status
 * POST — Manually create a Substack draft from an existing blog post slug
 */

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enabled = isSubstackEnabled();
  const hasCookie = !!process.env.SUBSTACK_SESSION_COOKIE;
  const hasPubUrl = !!process.env.SUBSTACK_PUBLICATION_URL;
  const hasUserId = !!process.env.SUBSTACK_USER_ID;

  if (!enabled) {
    return NextResponse.json({
      configured: false,
      hasSessionCookie: hasCookie,
      hasPublicationUrl: hasPubUrl,
      hasUserId: hasUserId,
      setupInstructions: {
        step1: "Create a Substack publication (if you haven't)",
        step2: "In Chrome: F12 > Application > Cookies > substack.com > copy 'substack.sid' value",
        step3: "Add to Vercel env: SUBSTACK_SESSION_COOKIE=<cookie value>",
        step4: "Add to Vercel env: SUBSTACK_PUBLICATION_URL=https://yourpub.substack.com",
        step5: "Hit GET /api/admin/substack?discover=true to find your user ID, then add SUBSTACK_USER_ID",
        step6: "Redeploy Vercel",
      },
    });
  }

  // If configured, test the connection
  const test = await testSubstackConnection();
  return NextResponse.json({
    configured: true,
    connection: test,
    publicationUrl: process.env.SUBSTACK_PUBLICATION_URL,
    userId: process.env.SUBSTACK_USER_ID,
  });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSubstackEnabled()) {
    return NextResponse.json({ error: "Substack not configured" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const slug = body.slug;

  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

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
    };

    // Get body after the metadata block
    const bodyStart = mdxContent.indexOf("\n}") + 2;
    const bodyMarkdown = mdxContent.slice(bodyStart).trim();

    // Build cover image URL (absolute)
    const coverImageUrl = metadata.coverImage?.startsWith("http")
      ? metadata.coverImage
      : metadata.coverImage
      ? `https://www.r2ftrading.com${metadata.coverImage}`
      : undefined;

    // Add canonical link back to R2F at the top of the Substack body
    const canonicalNote = `*This post was originally published at [R2F Trading](https://www.r2ftrading.com/trading-insights/${slug}).*\n\n`;
    const fullBody = canonicalNote + bodyMarkdown;

    const result = await createSubstackDraft({
      title: metadata.title,
      subtitle: metadata.excerpt || "",
      bodyMarkdown: fullBody,
      coverImageUrl,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create draft" },
      { status: 500 }
    );
  }
}
