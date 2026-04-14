import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { isGSCConfigured, getSearchQueries } from "@/lib/search-console";
import { readFile } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configured = isGSCConfigured();

  if (!configured) {
    return NextResponse.json({
      configured: false,
      topQueries: [],
      topPages: [],
      contentGaps: [],
      suggestions: [],
      searchStats: null,
    });
  }

  try {
    const searchData = await getSearchQueries();

    // Load saved content suggestions
    let suggestions: unknown[] = [];
    try {
      const raw = await readFile("data/search-content-suggestions.json");
      const parsed = JSON.parse(raw);
      suggestions = parsed.suggestions || [];
    } catch {
      // No suggestions yet
    }

    if (!searchData) {
      return NextResponse.json({
        configured: true,
        error: "Failed to fetch search data. Check service account permissions.",
        topQueries: [],
        topPages: [],
        contentGaps: [],
        suggestions,
        searchStats: null,
      });
    }

    return NextResponse.json({
      configured: true,
      ...searchData,
      suggestions,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
