/**
 * Content type registry for YouTube Shorts variety.
 * Each type defines a unique scene structure, visual strategy, and script template.
 */

export interface ContentType {
  id: string;
  name: string;
  description: string;
  sceneCount: number;
  targetDuration: string; // e.g. "25-35" seconds
  targetWords: string; // e.g. "70-90"
  sceneTemplate: string; // Describes scene structure for Claude
  visualStrategy: string; // How to pick visuals
  voiceTone: string; // Voice direction for Claude
  exampleHook: string;
}

export const CONTENT_TYPES: ContentType[] = [
  {
    id: "listicle",
    name: "Listicle",
    description: "Numbered tips, mistakes, or rules",
    sceneCount: 6,
    targetDuration: "30-45",
    targetWords: "90-130",
    sceneTemplate: `Scene 1: HOOK — shocking statement about the list topic
Scenes 2-5: Each scene = one numbered tip/mistake/rule (brief, punchy)
Scene 6: CTA — follow for more`,
    visualStrategy: "Mix of chart images for each tip + emotion B-roll for hook/CTA",
    voiceTone: "Authoritative, counting down with energy",
    exampleHook: "5 mistakes that BLEW UP my trading account. Number 3 still haunts me.",
  },
  {
    id: "chart-breakdown",
    name: "Chart Breakdown",
    description: "Annotated chart walkthrough explaining a setup",
    sceneCount: 4,
    targetDuration: "25-35",
    targetWords: "70-90",
    sceneTemplate: `Scene 1: HOOK — "Look at this setup" or "This is textbook ICT"
Scene 2: Point out the setup (order block, FVG, liquidity)
Scene 3: Explain entry/exit or what happened
Scene 4: Key takeaway + CTA`,
    visualStrategy: "ALL chart images — each showing progressive stages of the setup",
    voiceTone: "Teacher explaining, pointing things out, excited about the setup",
    exampleHook: "This is the CLEANEST order block I've ever seen. Let me break it down.",
  },
  {
    id: "before-after",
    name: "Before/After",
    description: "Transformation comparison — before ICT vs after",
    sceneCount: 4,
    targetDuration: "25-35",
    targetWords: "70-90",
    sceneTemplate: `Scene 1: HOOK — dramatic contrast statement
Scene 2: BEFORE — what the old approach looked like (messy, random)
Scene 3: AFTER — what the ICT approach looks like (clean, precise)
Scene 4: The difference maker + CTA`,
    visualStrategy: "Scene 2: messy chart or frustration B-roll. Scene 3: clean chart or confidence B-roll",
    voiceTone: "Dramatic contrast — frustrated tone for 'before', confident for 'after'",
    exampleHook: "My charts used to look like a kindergartner drew on them. Now they look like this.",
  },
  {
    id: "story",
    name: "Personal Story",
    description: "Trading experience narrative — loss, lesson, or breakthrough",
    sceneCount: 5,
    targetDuration: "30-40",
    targetWords: "90-120",
    sceneTemplate: `Scene 1: HOOK — dramatic opening about the experience
Scene 2: What happened — the situation, the trade, the moment
Scene 3: The turning point or lesson
Scene 4: What I learned / what changed
Scene 5: Advice + CTA`,
    visualStrategy: "Emotion B-roll heavy — frustration, thinking, revelation, confidence",
    voiceTone: "Vulnerable and real, then building to confident. Storytelling voice.",
    exampleHook: "I stared at my screen. $12,000 gone. In three trades. Here's what I did next.",
  },
  {
    id: "quiz",
    name: "Quiz / Poll",
    description: "Interactive — 'Is this valid?' drives comments",
    sceneCount: 4,
    targetDuration: "20-30",
    targetWords: "50-70",
    sceneTemplate: `Scene 1: HOOK — present the question with a chart
Scene 2: Show the setup — "Is this a valid order block?"
Scene 3: Reveal the answer with explanation
Scene 4: "Comment your answer + follow for more quizzes"`,
    visualStrategy: "Chart images throughout — the quiz IS the chart",
    voiceTone: "Playful, challenging the viewer. 'Think you know? Let's find out.'",
    exampleHook: "Is this a valid order block? 90% of traders get this WRONG. Comment your answer.",
  },
  {
    id: "myth-buster",
    name: "Myth Buster",
    description: "MYTH vs TRUTH format — debunking common beliefs",
    sceneCount: 4,
    targetDuration: "25-35",
    targetWords: "70-90",
    sceneTemplate: `Scene 1: HOOK — state the myth dramatically
Scene 2: Why people believe the myth
Scene 3: The TRUTH — what actually works
Scene 4: Key takeaway + CTA`,
    visualStrategy: "Scene 1-2: frustration/confusion B-roll. Scene 3-4: chart proof + confidence B-roll",
    voiceTone: "Myth = dismissive/mocking tone. Truth = confident, teaching.",
    exampleHook: "MYTH: You need a 70% win rate to be profitable. TRUTH: You need 1:3 risk-reward.",
  },
  {
    id: "pov",
    name: "POV Advice",
    description: "POV format — advice disguised as relatable scenario",
    sceneCount: 4,
    targetDuration: "20-30",
    targetWords: "60-80",
    sceneTemplate: `Scene 1: HOOK — "POV: you just realized [specific thing]"
Scene 2: Describe the aha moment
Scene 3: What to do about it
Scene 4: CTA`,
    visualStrategy: "Screen glow B-roll for POV feeling + chart images for the aha moment",
    voiceTone: "Intimate, like talking to yourself. Reflective then empowered.",
    exampleHook: "POV: You just realized every order block you've been trading was in discount.",
  },
  {
    id: "rapid-fire",
    name: "Rapid Fire Tips",
    description: "Quick 1-sentence tips, fast pace, high energy",
    sceneCount: 7,
    targetDuration: "25-35",
    targetWords: "70-90",
    sceneTemplate: `Scene 1: HOOK — "7 ICT tips in 30 seconds. Ready?"
Scenes 2-7: Each scene = ONE short tip (5-10 words max per scene)
Quick cuts between each tip. No elaboration.`,
    visualStrategy: "Fast-cutting chart images — one per tip, different chart/pair each",
    voiceTone: "FAST. Energetic. Machine gun delivery. No pauses between tips.",
    exampleHook: "7 ICT tips in 30 seconds. Save this. You'll need it.",
  },
  {
    id: "debate",
    name: "Debate / Comparison",
    description: "X vs Y — comparing two approaches, strategies, or tools",
    sceneCount: 5,
    targetDuration: "30-40",
    targetWords: "80-110",
    sceneTemplate: `Scene 1: HOOK — "X vs Y — which is actually better?"
Scene 2: Case for X — its strengths
Scene 3: Case for Y — its strengths
Scene 4: The verdict — which one and why
Scene 5: CTA`,
    visualStrategy: "Side-by-side chart comparisons + thinking B-roll for verdict",
    voiceTone: "Fair but opinionated. Present both, then drop the verdict confidently.",
    exampleHook: "Order blocks vs Fair Value Gaps. Everyone argues about this. Here's the real answer.",
  },
  {
    id: "review",
    name: "Tool / Platform Review",
    description: "Quick review of a trading tool, platform, or resource",
    sceneCount: 4,
    targetDuration: "25-35",
    targetWords: "70-90",
    sceneTemplate: `Scene 1: HOOK — "Is [tool] worth it? Honest review."
Scene 2: What it does / key features
Scene 3: Pros and cons — honest take
Scene 4: Verdict + CTA`,
    visualStrategy: "Screen recordings or screenshots of the tool + trading desk B-roll",
    voiceTone: "Honest reviewer. Not salesy. Give real opinion.",
    exampleHook: "I tried FTMO for 6 months. Here's my honest verdict.",
  },
];

/**
 * Select the next content type to use, rotating to maintain variety.
 * Checks recent history and picks the least-used type.
 */
export function selectContentType(recentTypes: string[]): ContentType {
  // Count usage of each type in recent history
  const usage: Record<string, number> = {};
  for (const type of CONTENT_TYPES) {
    usage[type.id] = recentTypes.filter((t) => t === type.id).length;
  }

  // Sort by least used, then random among ties
  const sorted = [...CONTENT_TYPES].sort((a, b) => {
    const diff = (usage[a.id] || 0) - (usage[b.id] || 0);
    if (diff !== 0) return diff;
    return Math.random() - 0.5;
  });

  return sorted[0];
}
