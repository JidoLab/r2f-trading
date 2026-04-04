import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile, deleteFile } from "@/lib/github";
import { notifyIndexNow } from "@/lib/indexnow";
import { postToAll } from "@/lib/social";
import { extractPostMetadata } from "@/lib/post-metadata";

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const { withSocials } = await req.json();

  try {
    // Read draft content
    let content: string;
    try {
      content = await readFile(`content/drafts/${slug}.mdx`);
    } catch {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    // Move from drafts to blog (publish)
    await commitFile(
      `content/blog/${slug}.mdx`,
      content,
      `Publish: ${slug}`
    );

    // Delete draft
    try {
      await deleteFile(`content/drafts/${slug}.mdx`, `Remove draft: ${slug}`);
    } catch { /* draft cleanup is best-effort */ }

    // Notify search engines
    await notifyIndexNow([`/trading-insights/${slug}`, `/trading-insights`, `/sitemap.xml`]);

    // Post to socials if requested
    let socialResults = null;
    if (withSocials) {
      const meta = extractPostMetadata(content);
      if (meta) {
        try {
          socialResults = await postToAll({ ...meta, slug });
          console.log(`[publish] Social results for ${slug}:`, JSON.stringify(socialResults));
        } catch (err) {
          console.error(`[publish] Social posting failed for ${slug}:`, err);
        }
      } else {
        console.warn(`[publish] Could not extract metadata for social posting: ${slug}`);
      }
    }

    return NextResponse.json({ success: true, published: true, withSocials, socialResults });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
