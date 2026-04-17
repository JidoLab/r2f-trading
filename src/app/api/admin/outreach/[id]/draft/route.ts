import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile } from "@/lib/github";
import { draftPitch, scrapeBlogContext, type OutreachTarget } from "@/lib/outreach";

export const maxDuration = 60;

const DATA_PATH = "data/outreach-targets.json";

/**
 * POST — generate (or regenerate) a pitch draft for this target.
 * If the target hasn't been scraped yet, scrapes first.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  let targets: OutreachTarget[] = [];
  try {
    const raw = await readFile(DATA_PATH);
    targets = JSON.parse(raw);
    if (!Array.isArray(targets)) targets = [];
  } catch {
    return NextResponse.json({ error: "No targets yet" }, { status: 404 });
  }

  const idx = targets.findIndex((t) => t.id === id);
  if (idx < 0) return NextResponse.json({ error: "Target not found" }, { status: 404 });

  const target = targets[idx];
  const now = new Date().toISOString();

  // Scrape if no context yet
  if (!target.context || target.context.scrapeError) {
    try {
      target.context = await scrapeBlogContext(target.url);
    } catch (err) {
      target.context = {
        scrapedAt: now,
        scrapeError: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Draft the pitch
  try {
    const pitch = await draftPitch(target);
    target.pitch = pitch;
    target.status = "drafted";
    target.updatedAt = now;
    targets[idx] = target;
    await commitFile(
      DATA_PATH,
      JSON.stringify(targets, null, 2),
      `outreach: draft pitch for ${target.name}`,
    );
    return NextResponse.json({ target });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to draft pitch" },
      { status: 500 },
    );
  }
}
