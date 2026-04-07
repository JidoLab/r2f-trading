import Anthropic from "@anthropic-ai/sdk";
import { commitFile, readFile } from "./github";

/**
 * Smart Topic Calendar — generates content plan with market awareness.
 * For 90+ days, generates in 30-day chunks to stay within token limits.
 */
export async function generateContentCalendar(daysAhead: number = 90): Promise<void> {
  const anthropic = new Anthropic();

  // Get performance data
  let perfContext = "";
  try {
    const perf = JSON.parse(await readFile("data/shorts/performance.json"));
    if (perf.videos?.length >= 10) {
      const sorted = [...perf.videos].sort((a: { views: number }, b: { views: number }) => b.views - a.views);
      perfContext = `\nTop performers: ${sorted.slice(0, 5).map((v: { title: string }) => v.title).join(", ")}`;
    }
  } catch {}

  // Get market context
  let marketContext = "";
  try {
    const { buildMarketContext } = await import("./market-trends");
    marketContext = await buildMarketContext();
  } catch {}

  const allEntries: { date: string; topic: string; contentType: string; category: string; used: boolean }[] = [];
  const chunkSize = 30;

  for (let offset = 0; offset < daysAhead; offset += chunkSize) {
    const remaining = Math.min(chunkSize, daysAhead - offset);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + offset);
    const dates = Array.from({ length: remaining }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    // Track what we've already generated to avoid repeats
    const existingTopics = allEntries.map(e => e.topic).slice(-20).join(", ");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      messages: [{
        role: "user",
        content: `Generate a ${remaining}-day YouTube Shorts content calendar for R2F Trading (ICT trading coaching).

CONTENT TYPES (rotate evenly): listicle, chart-breakdown, before-after, story, quiz, myth-buster, pov, rapid-fire, debate, review

CATEGORIES: ICT Concepts, Trading Psychology, Risk Management, Funded Accounts, Market Analysis, Strategy Development
${perfContext}
${offset === 0 ? marketContext : ""}
DATES: ${dates.join(", ")}
${existingTopics ? `\nALREADY PLANNED (avoid repeats): ${existingTopics}` : ""}

Return ONLY a JSON array (no code fences):
[{"date":"YYYY-MM-DD","topic":"specific engaging topic","contentType":"type_id","category":"category","used":false}]

Rules:
- Each content type appears roughly equally
- No two consecutive days with the same content type
- Mix categories evenly
- Topics must be specific and engaging, not generic
- Include seasonal/timely topics where appropriate
- 3 topics per date (we publish 3 Shorts/day)`,
      }],
    });

    let text = response.content[0].type === "text" ? response.content[0].text : "";
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) continue;

    try {
      const chunk = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      allEntries.push(...chunk);
    } catch {}
  }

  await commitFile("data/shorts/calendar.json", JSON.stringify(allEntries, null, 2), `Content calendar: ${daysAhead} days (${allEntries.length} entries)`);
}

/**
 * Mark a calendar entry as used
 */
export async function markCalendarUsed(date: string): Promise<void> {
  try {
    const raw = await readFile("data/shorts/calendar.json");
    const calendar = JSON.parse(raw);
    const entry = calendar.find((e: { date: string; used: boolean }) => e.date === date && !e.used);
    if (entry) entry.used = true;
    await commitFile("data/shorts/calendar.json", JSON.stringify(calendar, null, 2), `Calendar: used ${date}`);
  } catch {}
}
