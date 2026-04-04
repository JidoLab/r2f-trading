import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile } from "@/lib/github";
import { postToAll } from "@/lib/social";
import { extractPostMetadata } from "@/lib/post-metadata";
import fs from "fs";
import path from "path";

export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  try {
    // Read the post content
    let content: string;
    const localPath = path.join(process.cwd(), "content", "blog", `${slug}.mdx`);
    if (fs.existsSync(localPath)) {
      content = fs.readFileSync(localPath, "utf-8");
    } else {
      content = await readFile(`content/blog/${slug}.mdx`);
    }

    const meta = extractPostMetadata(content);
    if (!meta) {
      return NextResponse.json({ error: "Could not extract post metadata" }, { status: 400 });
    }

    console.log(`[share] Sharing ${slug} to socials: title="${meta.title}"`);
    const results = await postToAll({ ...meta, slug });
    console.log(`[share] Results for ${slug}:`, JSON.stringify(results));

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Share failed";
    console.error(`[share] Failed for ${slug}:`, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
