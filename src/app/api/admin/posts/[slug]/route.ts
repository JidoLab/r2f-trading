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

  try {
    const content = await readFile(`content/blog/${slug}.mdx`);
    return NextResponse.json({ slug, content });
  } catch {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const { content } = await req.json();

  // Write locally if possible (dev mode)
  const localPath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (fs.existsSync(localPath)) {
    fs.writeFileSync(localPath, content, "utf-8");
  }

  // Also commit to GitHub (works in both dev and production)
  try {
    await commitFile(
      `content/blog/${slug}.mdx`,
      content,
      `Update blog post: ${slug}`
    );
  } catch (err) {
    // If GitHub fails but local write succeeded, still return success in dev
    if (!fs.existsSync(localPath)) {
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

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

  return NextResponse.json({ success: true });
}
