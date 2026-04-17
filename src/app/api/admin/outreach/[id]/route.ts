import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile } from "@/lib/github";
import { scrapeBlogContext, type OutreachTarget } from "@/lib/outreach";

export const maxDuration = 60;

const DATA_PATH = "data/outreach-targets.json";

async function loadTargets(): Promise<OutreachTarget[]> {
  try {
    const raw = await readFile(DATA_PATH);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveTargets(targets: OutreachTarget[], message: string): Promise<void> {
  await commitFile(DATA_PATH, JSON.stringify(targets, null, 2), message);
}

/** GET — fetch a single target */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const targets = await loadTargets();
  const target = targets.find((t) => t.id === id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ target });
}

/** PATCH — update target fields */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const updates = (await req.json().catch(() => ({}))) as Partial<OutreachTarget> & {
    rescrape?: boolean;
  };

  const targets = await loadTargets();
  const idx = targets.findIndex((t) => t.id === id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const target = targets[idx];
  const now = new Date().toISOString();

  // Whitelist fields that can be updated directly
  const allowed: (keyof OutreachTarget)[] = [
    "name",
    "url",
    "contactEmail",
    "guestPostUrl",
    "domainRating",
    "topics",
    "status",
    "notes",
    "pitchedAt",
    "repliedAt",
  ];
  for (const key of allowed) {
    if (key in updates && updates[key] !== undefined) {
      (target as unknown as Record<string, unknown>)[key] = updates[key] as unknown;
    }
  }

  // Auto-set pitchedAt when status moves to "pitched" (if not explicitly set)
  if (updates.status === "pitched" && !target.pitchedAt) {
    target.pitchedAt = now;
  }
  if (updates.status === "replied" && !target.repliedAt) {
    target.repliedAt = now;
  }

  // Optional rescrape
  if (updates.rescrape) {
    try {
      target.context = await scrapeBlogContext(target.url);
    } catch (err) {
      target.context = {
        scrapedAt: now,
        scrapeError: err instanceof Error ? err.message : String(err),
      };
    }
  }

  target.updatedAt = now;
  targets[idx] = target;
  await saveTargets(targets, `outreach: update ${target.name}`);

  return NextResponse.json({ target });
}

/** DELETE — remove a target */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const targets = await loadTargets();
  const idx = targets.findIndex((t) => t.id === id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const removed = targets.splice(idx, 1)[0];
  await saveTargets(targets, `outreach: delete ${removed.name}`);

  return NextResponse.json({ deleted: removed });
}
