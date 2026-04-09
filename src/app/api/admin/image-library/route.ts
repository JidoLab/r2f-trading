import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile, listFiles, deleteFile } from "@/lib/github";

export const maxDuration = 30;

export interface LibraryImage {
  id: string;
  filename: string;
  url: string;
  tags: string[];             // e.g. ["order-block", "bullish", "4h-timeframe"]
  patterns: string[];         // e.g. ["order block", "FVG", "breaker block"]
  category: string;           // e.g. "chart-pattern", "setup", "result", "concept"
  description: string;        // Human-readable: "Bullish order block on EUR/USD 4H"
  pair?: string;              // e.g. "EURUSD", "XAUUSD", "NAS100"
  timeframe?: string;         // e.g. "1M", "5M", "15M", "1H", "4H", "D"
  addedAt: string;
  usageCount: number;
}

// GET — list all images with optional filter
export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag");
  const pattern = searchParams.get("pattern");
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.toLowerCase();

  let images: LibraryImage[] = [];
  try {
    images = JSON.parse(await readFile("data/image-library-full.json"));
  } catch {}

  // Apply filters
  if (tag) images = images.filter(img => img.tags.includes(tag));
  if (pattern) images = images.filter(img => img.patterns.some(p => p.toLowerCase().includes(pattern.toLowerCase())));
  if (category) images = images.filter(img => img.category === category);
  if (q) images = images.filter(img =>
    img.description.toLowerCase().includes(q) ||
    img.tags.some(t => t.includes(q)) ||
    img.patterns.some(p => p.toLowerCase().includes(q)) ||
    (img.pair || "").toLowerCase().includes(q)
  );

  // Get all unique tags, patterns, categories for filter dropdowns
  let allImages: LibraryImage[] = [];
  try {
    allImages = JSON.parse(await readFile("data/image-library-full.json"));
  } catch {}
  const allTags = [...new Set(allImages.flatMap(img => img.tags))].sort();
  const allPatterns = [...new Set(allImages.flatMap(img => img.patterns))].sort();
  const allCategories = [...new Set(allImages.map(img => img.category))].sort();

  return NextResponse.json({ images, filters: { tags: allTags, patterns: allPatterns, categories: allCategories }, total: images.length });
}

// POST — add a new image to the library
export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { imageBase64, filename, tags, patterns, category, description, pair, timeframe } = await req.json();

    if (!imageBase64 || !filename) {
      return NextResponse.json({ error: "imageBase64 and filename required" }, { status: 400 });
    }

    const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ext = filename.split(".").pop() || "jpg";
    const safeName = `${id}.${ext}`;
    const path = `public/chart-library/${safeName}`;

    // Upload image to GitHub
    await commitFile(path, imageBase64, `Chart library: ${description?.slice(0, 40) || safeName}`, true);

    // Get the URL
    const url = `/chart-library/${safeName}`;

    // Add to library metadata
    let images: LibraryImage[] = [];
    try {
      images = JSON.parse(await readFile("data/image-library-full.json"));
    } catch {}

    const newImage: LibraryImage = {
      id,
      filename: safeName,
      url,
      tags: tags || [],
      patterns: patterns || [],
      category: category || "chart-pattern",
      description: description || "",
      pair: pair || undefined,
      timeframe: timeframe || undefined,
      addedAt: new Date().toISOString(),
      usageCount: 0,
    };

    images.push(newImage);
    await commitFile("data/image-library-full.json", JSON.stringify(images, null, 2), `Image library: +${description?.slice(0, 30) || id}`);

    return NextResponse.json({ success: true, image: newImage });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

// DELETE — remove an image
export async function DELETE(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await req.json();
    let images: LibraryImage[] = [];
    try {
      images = JSON.parse(await readFile("data/image-library-full.json"));
    } catch { return NextResponse.json({ error: "Library empty" }, { status: 404 }); }

    const idx = images.findIndex(img => img.id === id);
    if (idx === -1) return NextResponse.json({ error: "Image not found" }, { status: 404 });

    const img = images[idx];

    // Delete the file from GitHub
    await deleteFile(`public/chart-library/${img.filename}`, `Remove: ${img.description?.slice(0, 30) || img.id}`);

    // Remove from library
    images.splice(idx, 1);
    await commitFile("data/image-library-full.json", JSON.stringify(images, null, 2), `Image library: -${img.description?.slice(0, 30) || img.id}`);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
