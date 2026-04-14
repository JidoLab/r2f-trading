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
    const { imageBase64, filename, tags, patterns, category, description, pair, timeframe, autoTag } = await req.json();

    if (!imageBase64 || !filename) {
      return NextResponse.json({ error: "imageBase64 and filename required" }, { status: 400 });
    }
    const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ext = filename.split(".").pop() || "jpg";
    const safeName = `${id}.${ext}`;
    const imgPath = `public/chart-library/${safeName}`;

    // Upload image to GitHub
    await commitFile(imgPath, imageBase64, `Chart library: ${description?.slice(0, 40) || safeName}`, true);

    // Get the URL — use GitHub raw URL so images display immediately without waiting for Vercel deploy
    const repo = process.env.GITHUB_REPO || "JidoLab/r2f-trading";
    const url = `https://raw.githubusercontent.com/${repo}/master/public/chart-library/${safeName}`;

    // Watermark the image via the DigitalOcean render service (non-blocking)
    const renderUrl = process.env.VIDEO_RENDER_URL;
    const renderSecret = process.env.RENDER_SECRET;
    if (renderUrl && renderSecret) {
      try {
        const wmRes = await fetch(`${renderUrl}/watermark`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${renderSecret}`,
          },
          body: JSON.stringify({ imageBase64, text: "R2F Trading", position: "bottom-right" }),
        });
        if (wmRes.ok) {
          const wmData = await wmRes.json();
          if (wmData.success && wmData.imageBase64) {
            // Overwrite the original with the watermarked version
            await commitFile(imgPath, wmData.imageBase64, `Watermark: ${safeName}`, true);
            console.log(`[image-library] Watermarked ${safeName}`);
          }
        } else {
          console.warn(`[image-library] Watermark service returned ${wmRes.status} — keeping original`);
        }
      } catch (wmErr) {
        console.warn("[image-library] Watermark failed (service may be down) — keeping original:", wmErr instanceof Error ? wmErr.message : "unknown");
      }
    }

    // Auto-tag with AI Vision if no description provided or autoTag requested
    let aiTags = tags || [];
    let aiPatterns = patterns || [];
    let aiCategory = category || "chart-pattern";
    let aiDescription = description || "";
    let aiPair = pair || undefined;
    let aiTimeframe = timeframe || undefined;

    if ((!description || autoTag) && process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType: `image/${ext === "png" ? "png" : "jpeg"}`, data: imageBase64 } },
              { text: `Analyze this image and return ONLY a JSON object with these fields:
{
  "description": "A concise, SEO-friendly description of what this image shows (under 100 chars)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "pick the BEST match from this list: chart-pattern, setup, result, concept, comparison, educational, leaderboard, achievement, screenshot, product, lifestyle, portrait, logo, infographic, other",
  "patterns": ["any trading patterns visible, e.g. order block, FVG, liquidity sweep. Use EMPTY ARRAY [] if not a price chart"],
  "pair": "trading pair if visible on a price chart (e.g. EURUSD, XAUUSD) or null",
  "timeframe": "chart timeframe if visible on a price chart (e.g. 1M, 5M, 15M, 1H, 4H, D) or null",
  "altText": "Descriptive alt text for SEO and accessibility (under 120 chars)"
}

CATEGORY GUIDE:
- "chart-pattern": A price/candlestick chart showing technical patterns
- "setup": A trade setup with entry/exit annotations
- "result": A trade result showing P&L
- "concept": An educational diagram explaining a trading concept
- "leaderboard": A ranking, competition result, or performance table
- "achievement": A certificate, award, badge, or milestone
- "screenshot": A software screenshot (platform, dashboard, app)
- "comparison": A before/after or side-by-side comparison
- "educational": An educational graphic or infographic about trading
- "product": A product photo
- "lifestyle": A lifestyle or environment photo
- "portrait": A photo of a person
- "logo": A logo or brand asset
- "infographic": A data visualization or infographic
- "other": Anything that doesn't fit above

IMPORTANT: Do NOT default to "chart-pattern" unless the image actually shows a price chart with candles. A leaderboard is NOT a chart pattern. A screenshot of trading positions is NOT a chart pattern.

Return ONLY the JSON.` }
            ],
          }],
        });

        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonStart = responseText.indexOf("{");
        const jsonEnd = responseText.lastIndexOf("}");
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const aiResult = JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));
          if (!description) aiDescription = aiResult.description || "";
          if (!tags || tags.length === 0) aiTags = aiResult.tags || [];
          if (!patterns || patterns.length === 0) aiPatterns = aiResult.patterns || [];
          if (!category) aiCategory = aiResult.category || "chart-pattern";
          if (!pair && aiResult.pair) aiPair = aiResult.pair;
          if (!timeframe && aiResult.timeframe) aiTimeframe = aiResult.timeframe;
        }
      } catch (err) {
        console.error("[image-library] Auto-tag failed:", err instanceof Error ? err.message : "unknown");
        // Fall through with whatever manual data was provided
      }
    }

    // Add to library metadata
    let images: LibraryImage[] = [];
    try {
      images = JSON.parse(await readFile("data/image-library-full.json"));
    } catch {}

    const newImage: LibraryImage = {
      id,
      filename: safeName,
      url,
      tags: aiTags,
      patterns: aiPatterns,
      category: aiCategory,
      description: aiDescription,
      pair: aiPair,
      timeframe: aiTimeframe,
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
