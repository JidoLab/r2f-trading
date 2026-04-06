/**
 * Market Trends Module
 * Fetches economic calendar events, Google Trends data, and generates
 * trend-aware content context for blog/Shorts generation.
 */

// Major recurring forex events with typical market impact
const RECURRING_EVENTS: { name: string; impact: "high" | "medium"; dayOfWeek?: number; weekOfMonth?: number; dayOfMonth?: number; tradingAngle: string }[] = [
  // Monthly
  { name: "Non-Farm Payrolls (NFP)", impact: "high", dayOfWeek: 5, weekOfMonth: 1, tradingAngle: "How to trade NFP with ICT concepts — liquidity sweeps before and after the release" },
  { name: "CPI (Consumer Price Index)", impact: "high", dayOfMonth: 13, tradingAngle: "CPI releases create massive volatility — how smart money positions before inflation data" },
  { name: "FOMC Interest Rate Decision", impact: "high", dayOfMonth: 0, tradingAngle: "Fed decisions move every market — how to read the reaction using order blocks" },
  { name: "PPI (Producer Price Index)", impact: "medium", dayOfMonth: 14, tradingAngle: "PPI often foreshadows CPI — how to use it as a leading indicator" },
  { name: "Retail Sales", impact: "medium", dayOfMonth: 16, tradingAngle: "Retail sales data reveals consumer strength — USD pairs react strongly" },
  { name: "PMI Data", impact: "medium", dayOfWeek: 1, weekOfMonth: 1, tradingAngle: "PMI data sets the tone for the month — manufacturing vs services divergence" },
  // Quarterly
  { name: "GDP Release", impact: "high", dayOfMonth: 28, tradingAngle: "Quarterly GDP surprises create trend reversals — how to prepare" },
  { name: "Earnings Season", impact: "medium", dayOfMonth: 0, tradingAngle: "Earnings season liquidity — how institutional flows affect forex through correlation" },
];

// Weekly recurring events
const WEEKLY_CONTEXT: Record<number, string> = {
  0: "Sunday: Asian session opens — set your weekly bias. Review higher timeframe charts for the week ahead.",
  1: "Monday: London open sets the weekly tone. Watch for false breaks of Friday's range. Smart money often establishes the weekly high or low today.",
  2: "Tuesday: Continuation day — trends established Monday often extend. Key day for NY session entries.",
  3: "Mid-week reversal day — Wednesdays statistically see reversals. FOMC decisions often fall on Wednesdays.",
  4: "Thursday: Strong trend day, often the highest volume day. Bank of England decisions typically fall on Thursdays.",
  5: "Friday: NFP day (first Friday of month). Otherwise, profit-taking and position squaring before the weekend. Reduced liquidity after London close.",
  6: "Weekend: Market closed — time for backtesting, journaling, and preparing next week's watchlist.",
};

/**
 * Get upcoming economic events for the next N days
 */
export function getUpcomingEvents(daysAhead: number = 7): { name: string; impact: string; tradingAngle: string; approximate: boolean }[] {
  const today = new Date();
  const events: { name: string; impact: string; tradingAngle: string; approximate: boolean }[] = [];
  const currentDay = today.getDay();
  const currentDate = today.getDate();
  const currentWeek = Math.ceil(currentDate / 7);

  for (const event of RECURRING_EVENTS) {
    let isUpcoming = false;

    if (event.dayOfWeek !== undefined && event.weekOfMonth !== undefined) {
      // e.g., First Friday of month (NFP)
      if (currentWeek === event.weekOfMonth) {
        const daysUntil = (event.dayOfWeek - currentDay + 7) % 7;
        if (daysUntil <= daysAhead) isUpcoming = true;
      }
    } else if (event.dayOfMonth && event.dayOfMonth > 0) {
      const daysUntil = event.dayOfMonth - currentDate;
      if (daysUntil >= 0 && daysUntil <= daysAhead) isUpcoming = true;
    }

    if (isUpcoming) {
      events.push({ name: event.name, impact: event.impact, tradingAngle: event.tradingAngle, approximate: true });
    }
  }

  return events;
}

/**
 * Get weekly context for today
 */
export function getWeeklyContext(): string {
  return WEEKLY_CONTEXT[new Date().getDay()] || "";
}

/**
 * Fetch Google Trends data for trading-related queries
 * Uses the unofficial trends explore endpoint
 */
export async function getTrendingTopics(): Promise<string[]> {
  const queries = [
    "ICT trading", "order blocks", "fair value gap", "smart money concepts",
    "funded trader", "FTMO", "prop firm", "forex strategy", "trading psychology",
    "liquidity sweep", "break of structure", "market structure",
  ];

  // Use Google Trends RSS for related rising queries
  const trending: string[] = [];
  try {
    const res = await fetch(
      `https://trends.google.com/trending/rss?geo=US&cat=7`, // Category 7 = Finance
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const text = await res.text();
      // Extract trending topic titles from RSS
      const titles = text.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) || [];
      for (const match of titles.slice(0, 10)) {
        const topic = match.replace(/<title><!\[CDATA\[/, "").replace(/\]\]><\/title>/, "");
        if (topic && topic !== "Daily Search Trends") trending.push(topic);
      }
    }
  } catch {}

  // Also check for finance-specific trending
  try {
    const res = await fetch(
      "https://trends.google.com/trending/rss?geo=US&cat=784", // Category 784 = Investing
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const text = await res.text();
      const titles = text.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) || [];
      for (const match of titles.slice(0, 5)) {
        const topic = match.replace(/<title><!\[CDATA\[/, "").replace(/\]\]><\/title>/, "");
        if (topic && !trending.includes(topic)) trending.push(topic);
      }
    }
  } catch {}

  return trending.length > 0 ? trending : queries.slice(0, 5); // Fallback to core queries
}

/**
 * Build full market context string for Claude when generating content
 */
export async function buildMarketContext(): Promise<string> {
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const fullDate = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const weeklyCtx = getWeeklyContext();
  const events = getUpcomingEvents(7);
  const trending = await getTrendingTopics();

  let context = `\n=== MARKET CONTEXT (${dayName}, ${fullDate}) ===\n`;
  context += `\nWEEKLY CONTEXT: ${weeklyCtx}\n`;

  if (events.length > 0) {
    context += `\nUPCOMING ECONOMIC EVENTS (next 7 days):\n`;
    for (const e of events) {
      context += `- ${e.name} (${e.impact} impact) — CONTENT ANGLE: ${e.tradingAngle}\n`;
    }
    context += `\nIMPORTANT: If a major event is within 1-2 days, strongly consider making content about it. Timely content gets 3-5x more search traffic.\n`;
  }

  if (trending.length > 0) {
    context += `\nTRENDING TOPICS (Google Trends - Finance/Investing):\n`;
    context += trending.map(t => `- "${t}"`).join("\n") + "\n";
    context += `\nIf any trending topic relates to ICT/forex trading, incorporate it for SEO. Use the trending term as a keyword.\n`;
  }

  // Seasonal patterns
  const month = today.getMonth();
  const seasonalHints: Record<number, string> = {
    0: "January: New year resolutions — 'start trading in 2026', funded account challenges restarting",
    1: "February: Post-resolution dropout — 'why traders fail', 'how to stay consistent'",
    2: "March: Q1 end — quarterly rebalancing, 'Q1 trading review', funded account cycles",
    3: "April: Tax season — 'trading taxes', 'tax deductions for traders'. Spring volatility.",
    4: "May: 'Sell in May' narrative — counter or support it with ICT perspective",
    5: "June: Summer lull approaching — 'how to trade low volatility', 'summer trading strategies'",
    6: "July: Mid-year review — '6-month trading review', 'reset your trading plan'",
    7: "August: Lowest liquidity month — 'August trading risks', 'vacation trading tips'",
    8: "September: Volatility returns — 'fall trading setup', FOMC typically active",
    9: "October: Earnings season + market fear — 'trading during uncertainty'",
    10: "November: Thanksgiving thin markets — 'year-end trading prep', Black Friday correlations",
    11: "December: Year-end — 'trading year review', 'goals for next year', holiday thin markets",
  };
  if (seasonalHints[month]) {
    context += `\nSEASONAL: ${seasonalHints[month]}\n`;
  }

  return context;
}

/**
 * Generate SEO keyword suggestions for a given topic
 */
export function generateKeywordVariations(topic: string): string[] {
  const baseTerms = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const modifiers = [
    "how to", "best", "guide", "strategy", "for beginners",
    "explained", "vs", "mistakes", "tips", "2026",
  ];
  const variations: string[] = [topic];
  for (const mod of modifiers.slice(0, 5)) {
    variations.push(`${mod} ${topic}`);
    variations.push(`${topic} ${mod}`);
  }
  return variations;
}
