import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile } from "@/lib/github";
import { SEED_TARGETS, type OutreachTarget } from "@/lib/outreach";

export const maxDuration = 30;

const DATA_PATH = "data/outreach-targets.json";

/**
 * POST — seed the outreach target list with curated starter blogs.
 * Idempotent: skips seeds whose URL already exists in the database.
 */
export async function POST() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let existing: OutreachTarget[] = [];
  try {
    const raw = await readFile(DATA_PATH);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) existing = parsed;
  } catch {
    // empty — first seed
  }

  const existingUrls = new Set(existing.map((t) => t.url.toLowerCase().replace(/\/$/, "")));
  const now = new Date().toISOString();
  const added: OutreachTarget[] = [];

  for (const seed of SEED_TARGETS) {
    const normalized = seed.url.toLowerCase().replace(/\/$/, "");
    if (existingUrls.has(normalized)) continue;

    const target: OutreachTarget = {
      id: `target-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...seed,
      status: "untouched",
      createdAt: now,
      updatedAt: now,
    };
    added.push(target);
    existingUrls.add(normalized);
  }

  if (added.length === 0) {
    return NextResponse.json({ added: 0, message: "All seed targets already exist" });
  }

  const combined = [...added, ...existing];
  await commitFile(
    DATA_PATH,
    JSON.stringify(combined, null, 2),
    `outreach: seed ${added.length} starter targets`,
  );

  return NextResponse.json({ added: added.length, total: combined.length });
}
