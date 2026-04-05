import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const SHORTS_DIR = path.join(process.cwd(), "scripts", "shorts", "projects");

interface ShortScript {
  title: string;
  description: string;
  hashtags: string[];
  script: string;
  hookLine: string;
  ctaLine: string;
  textOverlays: { timestamp: string; text: string; style: "hook" | "key-point" | "stat" | "cta" }[];
  visualNotes: string[];
  estimatedDuration: number;
}

async function generateScript(topic?: string): Promise<ShortScript> {
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Generate a YouTube Shorts script for R2F Trading (ICT trading coaching by Harvest Wright, 10+ years experience).

${topic ? `TOPIC: "${topic}"` : "Pick a trending/engaging ICT trading topic that would perform well as a Short."}

REQUIREMENTS:
- 30-45 seconds when spoken (approximately 80-120 words)
- Start with a strong HOOK (first 2 seconds must grab attention)
- Include 2-3 key points or insights
- End with a CTA (follow for more, link in bio, book a call)
- Conversational, direct tone — as if talking to a trading buddy
- Include specific ICT terms (order blocks, FVGs, liquidity, killzones) naturally

FORMAT:
- Script should be written exactly as spoken — no stage directions
- Include pauses with "..." for natural pacing

Return ONLY a JSON object (no code fences):
{
  "title": "YouTube Short title (max 100 chars, attention-grabbing)",
  "description": "YouTube description with keywords (2-3 sentences + hashtags)",
  "hashtags": ["#ICTTrading", "#ForexTrader", "..."],
  "script": "The exact words to speak, with ... for pauses",
  "hookLine": "The opening hook text overlay (5-8 words max)",
  "ctaLine": "The CTA text overlay (e.g. 'Follow for daily ICT tips')",
  "textOverlays": [
    {"timestamp": "0s", "text": "HOOK TEXT", "style": "hook"},
    {"timestamp": "8s", "text": "Key point 1", "style": "key-point"},
    {"timestamp": "18s", "text": "Important stat or fact", "style": "stat"},
    {"timestamp": "30s", "text": "CTA text", "style": "cta"}
  ],
  "visualNotes": ["Description of what charts/visuals to show at each point"],
  "estimatedDuration": 35
}`,
    }],
  });

  let text = response.content[0].type === "text" ? response.content[0].text : "";
  text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  return JSON.parse(text);
}

async function main() {
  const topic = process.argv[2] || undefined;

  console.log("🎬 R2F YouTube Shorts Script Generator\n");
  if (topic) console.log(`Topic: ${topic}\n`);

  console.log("Generating script with Claude...");
  const script = await generateScript(topic);

  console.log(`\n📝 Title: ${script.title}`);
  console.log(`⏱️  Duration: ~${script.estimatedDuration}s`);
  console.log(`\n--- SCRIPT ---`);
  console.log(script.script);
  console.log(`--- END ---\n`);

  console.log("📌 Text Overlays:");
  for (const overlay of script.textOverlays) {
    console.log(`  [${overlay.timestamp}] (${overlay.style}) ${overlay.text}`);
  }

  console.log("\n🎥 Visual Notes:");
  for (const note of script.visualNotes) {
    console.log(`  - ${note}`);
  }

  // Save to project folder
  fs.mkdirSync(SHORTS_DIR, { recursive: true });
  const slug = script.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const projectDir = path.join(SHORTS_DIR, slug);
  fs.mkdirSync(projectDir, { recursive: true });

  fs.writeFileSync(
    path.join(projectDir, "script.json"),
    JSON.stringify(script, null, 2)
  );

  // Save script as readable text file for easy reading while recording
  fs.writeFileSync(
    path.join(projectDir, "READ-THIS.txt"),
    `R2F TRADING - YOUTUBE SHORT SCRIPT
====================================

TITLE: ${script.title}
DURATION: ~${script.estimatedDuration} seconds

--- READ THIS ALOUD ---

${script.script}

--- END ---

TIPS:
- Speak clearly and with energy
- Pause where you see "..."
- Keep it under ${script.estimatedDuration} seconds
- Record in a quiet space
- Save the audio as voiceover.mp3 or voiceover.wav in this folder

After recording, run: npm run assemble-short "${slug}"
`
  );

  console.log(`\n✅ Saved to: scripts/shorts/projects/${slug}/`);
  console.log(`📖 Read the script from: scripts/shorts/projects/${slug}/READ-THIS.txt`);
  console.log(`🎤 Record your voiceover and save as: scripts/shorts/projects/${slug}/voiceover.mp3`);
  console.log(`🔧 Then run: npm run assemble-short "${slug}"`);
}

main().catch(console.error);
