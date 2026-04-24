import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { commitFile, deleteFile, readFile } from "@/lib/github";
import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  // Try local filesystem first (for dev), fall back to GitHub API
  const localPath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (fs.existsSync(localPath)) {
    const content = fs.readFileSync(localPath, "utf-8");
    return NextResponse.json({ slug, content });
  }

  // Try blog first, then drafts
  for (const dir of ["content/blog", "content/drafts"]) {
    try {
      const content = await readFile(`${dir}/${slug}.mdx`);
      return NextResponse.json({ slug, content, isDraft: dir === "content/drafts" });
    } catch { /* try next */ }
  }
  return NextResponse.json({ error: "Post not found" }, { status: 404 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const { content } = await req.json();

  // Determine if file is in blog or drafts
  let filePath = `content/blog/${slug}.mdx`;
  try {
    await readFile(`content/drafts/${slug}.mdx`);
    filePath = `content/drafts/${slug}.mdx`;
  } catch { /* not a draft, use blog path */ }

  // Commit to GitHub
  try {
    await commitFile(filePath, content, `Update: ${slug}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

interface PostRedirectEntry {
  from: string;
  to: string;
  deletedAt: string;
  reason?: string;
}

/**
 * Append a 301 redirect entry to data/post-redirects.json so the deleted
 * post's URL hands link-equity to its replacement. next.config.ts reads
 * this file at build time and generates Next.js redirects from it.
 */
async function recordRedirect(from: string, to: string, reason?: string) {
  const REDIRECTS_PATH = "data/post-redirects.json";
  let existing: PostRedirectEntry[] = [];
  try {
    const raw = await readFile(REDIRECTS_PATH);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) existing = parsed;
  } catch { /* file may not exist yet */ }

  // Dedupe: don't add the same redirect twice (idempotent on re-delete)
  if (existing.some((e) => e.from === from)) return;

  existing.push({
    from,
    to,
    deletedAt: new Date().toISOString(),
    ...(reason ? { reason } : {}),
  });
  await commitFile(
    REDIRECTS_PATH,
    JSON.stringify(existing, null, 2),
    `Redirect: /trading-insights/${from} -> /${to}`
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  // Optional: ?replacedBy=<surviving-slug>&reason=<why>
  // When present, append a permanent 301 redirect so the deleted URL
  // preserves link equity and stops showing as 404 in GSC.
  const url = new URL(req.url);
  const replacedBy = url.searchParams.get("replacedBy");
  const reason = url.searchParams.get("reason") || undefined;

  // Delete from GitHub first (works both locally and on Vercel)
  try {
    await deleteFile(`content/blog/${slug}.mdx`, `Delete blog post: ${slug}`);

    // Also delete associated images
    const imageFiles = [`${slug}-cover.jpg`, `${slug}-img1.jpg`, `${slug}-img2.jpg`];
    for (const img of imageFiles) {
      try {
        await deleteFile(`public/blog/${img}`, `Delete blog image: ${img}`);
      } catch { /* image may not exist */ }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Also delete locally if in dev mode
  try {
    const localPath = path.join(CONTENT_DIR, `${slug}.mdx`);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  } catch { /* read-only on Vercel, that's fine */ }

  // Record redirect AFTER successful delete so we never redirect to nothing.
  let redirectRecorded = false;
  if (replacedBy) {
    try {
      await recordRedirect(slug, replacedBy, reason);
      redirectRecorded = true;
    } catch (err) {
      // Non-fatal — the post is already deleted, redirect can be added
      // manually later via the JSON file.
      console.error(`[posts/delete] Failed to record redirect for ${slug}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    redirect: redirectRecorded ? { from: slug, to: replacedBy } : null,
  });
}
