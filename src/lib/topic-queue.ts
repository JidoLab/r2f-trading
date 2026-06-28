// Demand-driven blog topic queue.
//
// One pipeline feeding the daily blog generator with REAL-demand topics
// (instead of only Claude-invented ones). Two sources fill it:
//   1. Manual paste — the owner pastes real Google Search Console queries (or
//      any questions); an admin endpoint turns them into ranked blog titles.
//   2. GSC auto-mining — the content-from-search cron appends its page-2 query
//      suggestions here too (once GOOGLE_SERVICE_ACCOUNT_KEY is configured).
//
// generate-post consumes the highest-priority unused item before falling back
// to its category rotation, so the engine is demand-led but never blocked.

import { readFile, commitFile } from "@/lib/github";

export interface TopicQueueItem {
  id: string;
  title: string; // blog post title (<60 chars)
  question: string; // the original query/question that seeded it
  angle: string;
  targetKeyword: string;
  source: "gsc" | "manual";
  priority: "high" | "medium" | "low";
  addedAt: string;
  used: boolean;
  usedAt?: string;
  generatedSlug?: string;
}

const PATH = "data/blog-topic-queue.json";
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export async function loadQueue(): Promise<TopicQueueItem[]> {
  try {
    return JSON.parse(await readFile(PATH));
  } catch {
    return [];
  }
}

async function saveQueue(items: TopicQueueItem[], message: string): Promise<void> {
  // Keep the file bounded (used items are history; cap to last 500)
  const trimmed = items.length > 500 ? items.slice(-500) : items;
  await commitFile(PATH, JSON.stringify(trimmed, null, 2), message);
}

function slugKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Append new items, skipping any whose title duplicates an existing one. */
export async function addToQueue(
  items: Omit<TopicQueueItem, "id" | "addedAt" | "used">[]
): Promise<{ added: number; total: number }> {
  const queue = await loadQueue();
  const existing = new Set(queue.map((q) => slugKey(q.title)));
  let added = 0;
  for (const it of items) {
    const k = slugKey(it.title);
    if (!it.title || existing.has(k)) continue;
    existing.add(k);
    queue.push({
      ...it,
      id: `tq_${Date.now().toString(36)}_${added}`,
      addedAt: new Date().toISOString(),
      used: false,
    });
    added++;
  }
  if (added > 0) await saveQueue(queue, `Topic queue: +${added} (${items[0]?.source || "manual"})`);
  return { added, total: queue.length };
}

/** Highest-priority unused item, oldest first within a priority. */
export async function nextUnused(): Promise<TopicQueueItem | null> {
  const queue = await loadQueue();
  const pending = queue
    .filter((q) => !q.used)
    .sort((a, b) => {
      const pr = (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3);
      return pr !== 0 ? pr : a.addedAt.localeCompare(b.addedAt);
    });
  return pending[0] || null;
}

export async function markUsed(id: string, generatedSlug?: string): Promise<void> {
  const queue = await loadQueue();
  const item = queue.find((q) => q.id === id);
  if (!item) return;
  item.used = true;
  item.usedAt = new Date().toISOString();
  if (generatedSlug) item.generatedSlug = generatedSlug;
  await saveQueue(queue, `Topic queue: used "${item.title.slice(0, 40)}"`);
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await loadQueue();
  const next = queue.filter((q) => q.id !== id);
  if (next.length !== queue.length) await saveQueue(next, `Topic queue: removed item`);
}
