import Anthropic from "@anthropic-ai/sdk";
import { commitFile, readFile } from "./github";

/**
 * Phase 8: Smart Topic Calendar
 * Generates a 30-day content plan balanced across content types and categories.
 */
export async function generateContentCalendar(daysAhead: number = 30): Promise<void> {
  const anthropic = new Anthropic();

  // Get existing performance data if available
  let perfContext = "";
  try {
    const perf = JSON.parse(await readFile("data/shorts/performance.json"));
    if (perf.videos?.length >= 10) {
      const sorted = [...perf.videos].sort((a: any, b: any) => b.views - a.views);
      perfContext = `\nTop performers: ${sorted.slice(0, 3).map((v: any) => v.title).join(", ")}`;
    }
  } catch {}

  const startDate = new Date();
  const dates = Array.from({ length: daysAhead }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{
      role: "user",
      content: `Generate a ${daysAhead}-day YouTube Shorts content calendar for R2F Trading (ICT trading coaching).

CONTENT TYPES (rotate evenly): listicle, chart-breakdown, before-after, story, quiz, myth-buster, pov, rapid-fire, debate, review

CATEGORIES: ICT Concepts, Trading Psychology, Risk Management, Funded Accounts, Market Analysis, Strategy Development

DATES: ${dates.join(", ")}
${perfContext}

Return ONLY a JSON array (no code fences):
[
  {"date": "YYYY-MM-DD", "topic": "specific topic title", "contentType": "type_id", "category": "category", "used": false}
]

Rules:
- Each content type should appear roughly equally
- No two consecutive days with the same content type
- Mix categories evenly
- Topics should be specific and engaging, not generic
- Include seasonal/timely topics where appropriate`,
    }],
  });

  let text = response.content[0].type === "text" ? response.content[0].text : "";
  text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  const calendar = JSON.parse(text);

  await commitFile("data/shorts/calendar.json", JSON.stringify(calendar, null, 2), `Content calendar: ${daysAhead} days`);
}

/**
 * Mark a calendar entry as used
 */
export async function markCalendarUsed(date: string): Promise<void> {
  try {
    const raw = await readFile("data/shorts/calendar.json");
    const calendar = JSON.parse(raw);
    const entry = calendar.find((e: any) => e.date === date);
    if (entry) entry.used = true;
    await commitFile("data/shorts/calendar.json", JSON.stringify(calendar, null, 2), `Calendar: used ${date}`);
  } catch {}
}
