import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile } from "@/lib/github";
import { scrapeBlogContext, type OutreachTarget, type OutreachStatus } from "@/lib/outreach";

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

function makeId(): string {
  return `target-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** GET — list all targets, grouped by status */
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targets = await loadTargets();

  const byStatus: Record<OutreachStatus, OutreachTarget[]> = {
    untouched: [],
    researched: [],
    drafted: [],
    pitched: [],
    replied: [],
    accepted: [],
    rejected: [],
  };

  for (const t of targets) {
    if (byStatus[t.status]) byStatus[t.status].push(t);
    else byStatus.untouched.push(t);
  }

  const totals = {
    all: targets.length,
    active: byStatus.untouched.length + byStatus.researched.length + byStatus.drafted.length,
    inFlight: byStatus.pitched.length + byStatus.replied.length,
    won: byStatus.accepted.length,
    lost: byStatus.rejected.length,
  };

  return NextResponse.json({ targets, byStatus, totals });
}

/** POST — add a new target. Optionally auto-scrape on create. */
export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, url, contactEmail, guestPostUrl, domainRating, topics, skipScrape } = body as {
    name?: string;
    url?: string;
    contactEmail?: string;
    guestPostUrl?: string;
    domainRating?: OutreachTarget["domainRating"];
    topics?: string[];
    skipScrape?: boolean;
  };

  if (!name || !url) {
    return NextResponse.json({ error: "name and url required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const target: OutreachTarget = {
    id: makeId(),
    name,
    url,
    contactEmail,
    guestPostUrl,
    domainRating,
    topics,
    status: "untouched",
    createdAt: now,
    updatedAt: now,
  };

  // Auto-scrape unless skipped
  if (!skipScrape) {
    try {
      target.context = await scrapeBlogContext(url);
      if (target.context && !target.context.scrapeError) {
        target.status = "researched";
      }
    } catch (err) {
      target.context = {
        scrapedAt: now,
        scrapeError: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const targets = await loadTargets();
  targets.unshift(target);

  await saveTargets(targets, `outreach: add target ${name}`);

  return NextResponse.json({ target });
}
