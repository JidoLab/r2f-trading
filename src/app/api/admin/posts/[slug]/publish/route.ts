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
      try {
        // Extract metadata with simple string search (new Function() blocked on Vercel, RegExp escaping is fragile)
        function extractField(src: string, field: string): string {
          const patterns = [
            `${field}: "`, `${field}: '`, `${field}: \``,
            `${field}:"`, `${field}:'`, `${field}:\``,
          ];
          for (const p of patterns) {
            const start = src.indexOf(p);
            if (start === -1) continue;
            const valStart = start + p.length;
            const quote = p[p.length - 1];
            const end = src.indexOf(quote, valStart);
            if (end === -1) continue;
            return src.substring(valStart, end);
          }
          return "";
        }

        function extractArray(src: string, field: string): string[] {
          const start = src.indexOf(`${field}:`);
          if (start === -1) return [];
          const bracketStart = src.indexOf("[", start);
          const bracketEnd = src.indexOf("]", bracketStart);
          if (bracketStart === -1 || bracketEnd === -1) return [];
          const inner = src.substring(bracketStart + 1, bracketEnd);
          const items: string[] = [];
          let inQuote = false;
          let current = "";
          for (const ch of inner) {
            if (ch === '"' && !inQuote) { inQuote = true; continue; }
            if (ch === '"' && inQuote) { items.push(current); current = ""; inQuote = false; continue; }
            if (inQuote) current += ch;
          }
          return items;
        }

        const title = extractField(content, "title");
        const excerpt = extractField(content, "excerpt") || extractField(content, "seoDescription");
        const coverImage = extractField(content, "coverImage");
        const tags = extractArray(content, "tags");

        if (title) {
          postToAll({ title, excerpt, slug, coverImage, tags }).catch(() => {});
        }
      } catch { /* social posting is best-effort */ }
    }

    return NextResponse.json({ success: true, published: true, withSocials });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
