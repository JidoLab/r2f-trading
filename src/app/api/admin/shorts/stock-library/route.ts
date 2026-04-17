import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import {
  expandCategoryFromPexels,
  getLibraryStats,
  loadStockLibrary,
  PEXELS_QUERIES,
} from "@/lib/shorts-stock-library";

export const maxDuration = 60;

/**
 * GET — library stats (categories, counts, top/bottom used).
 * GET ?list=1 — return the full library array (for admin table).
 * POST — expand one or all categories from Pexels.
 *   body: { category?: string, count?: number, all?: boolean }
 *   If all=true, expands every category with the given count.
 */

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  if (searchParams.get("list") === "1") {
    const clips = await loadStockLibrary();
    return NextResponse.json({ clips, count: clips.length });
  }

  const stats = await getLibraryStats();
  return NextResponse.json({
    ...stats,
    availableCategories: Object.keys(PEXELS_QUERIES),
    pexelsConfigured: !!process.env.PEXELS_API_KEY,
  });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.PEXELS_API_KEY) {
    return NextResponse.json({ error: "PEXELS_API_KEY not set" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const count = Math.max(1, Math.min(parseInt(String(body.count || 10), 10), 30));

  if (body.all) {
    const results = [];
    for (const cat of Object.keys(PEXELS_QUERIES)) {
      const r = await expandCategoryFromPexels(cat, count);
      results.push(r);
      // Small delay to respect Pexels rate limits
      await new Promise((r) => setTimeout(r, 400));
    }
    const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
    return NextResponse.json({ results, totalAdded });
  }

  const category = body.category;
  if (!category) {
    return NextResponse.json(
      { error: "category required (or pass all:true)" },
      { status: 400 },
    );
  }

  const result = await expandCategoryFromPexels(category, count);
  return NextResponse.json(result);
}
