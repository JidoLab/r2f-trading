import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile, deleteFile } from "@/lib/github";
import { notifyIndexNow } from "@/lib/indexnow";
import { postToAll } from "@/lib/social";

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
    if (withSocials) {
      // Extract metadata from MDX for social posting
      const metaMatch = content.match(/export\s+const\s+metadata\s*=\s*(\{[\s\S]*?\n\})/);
      if (metaMatch) {
        try {
          const meta = new Function(`return ${metaMatch[1]}`)();
          postToAll({
            title: meta.title,
            excerpt: meta.excerpt || meta.seoDescription,
            slug,
            coverImage: meta.coverImage || "",
            tags: meta.tags || [],
          }).catch(() => {});
        } catch { /* social posting is best-effort */ }
      }
    }

    return NextResponse.json({ success: true, published: true, withSocials });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
