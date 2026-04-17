/**
 * Inject current date into Claude prompts to prevent outdated year references.
 *
 * Claude's training data has a cutoff and doesn't know the current date at inference
 * time. Without this injection, generated content often defaults to 2023/2024 even
 * when we're in 2026+. Paste the output of getCurrentDateContext() into any prompt
 * that references "current year", "recent events", "this year", etc.
 */

/**
 * Returns a concise, high-priority instruction block. Inject near the top of prompts.
 */
export function getCurrentDateContext(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const quarter = Math.ceil((now.getUTCMonth() + 1) / 3);

  return `CURRENT DATE: ${month} ${year} (Q${quarter} ${year}). Your training data predates this. When you reference the current year, "this year", "recent" market events, or include a year in a title/headline, use ${year} — NEVER ${year - 1} or earlier. Only reference older years for historical/retrospective context.`;
}

/**
 * Returns just the date values — useful when you want finer control over prompt wording.
 */
export function getCurrentDateValues(): {
  year: number;
  month: string;
  quarter: number;
  isoDate: string;
  dayOfWeek: string;
} {
  const now = new Date();
  return {
    year: now.getUTCFullYear(),
    month: now.toLocaleString("en-US", { month: "long", timeZone: "UTC" }),
    quarter: Math.ceil((now.getUTCMonth() + 1) / 3),
    isoDate: now.toISOString().split("T")[0],
    dayOfWeek: now.toLocaleString("en-US", { weekday: "long", timeZone: "UTC" }),
  };
}
