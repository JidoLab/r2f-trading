import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");
const IMAGE_DIR = path.join(process.cwd(), "public", "blog");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const content = fs.readFileSync(filePath, "utf-8");
  return NextResponse.json({ slug, content });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const { content } = await req.json();
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  fs.writeFileSync(filePath, content, "utf-8");
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Delete MDX file
  fs.unlinkSync(filePath);

  // Delete associated images
  const imageFiles = fs.readdirSync(IMAGE_DIR).filter((f) => f.startsWith(slug));
  for (const img of imageFiles) {
    fs.unlinkSync(path.join(IMAGE_DIR, img));
  }

  return NextResponse.json({ success: true });
}
