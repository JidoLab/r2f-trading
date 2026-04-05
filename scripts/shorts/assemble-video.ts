import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { GoogleGenAI } from "@google/genai";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const SHORTS_DIR = path.join(process.cwd(), "scripts", "shorts", "projects");
const ASSETS_DIR = path.join(process.cwd(), "public", "shorts", "assets");

interface TextOverlay {
  timestamp: string;
  text: string;
  style: "hook" | "key-point" | "stat" | "cta";
}

interface ShortScript {
  title: string;
  script: string;
  hookLine: string;
  ctaLine: string;
  textOverlays: TextOverlay[];
  visualNotes: string[];
  estimatedDuration: number;
}

function parseTimestamp(ts: string): number {
  const match = ts.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

async function generateBackgroundImage(prompt: string, filename: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: `${prompt}. Style: Dark navy (#0d2137) background, professional trading aesthetic, gold (#c9a84c) accents. Vertical 9:16 aspect ratio (1080x1920). No text in the image.`,
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData) {
        const imgPath = path.join(ASSETS_DIR, filename);
        fs.writeFileSync(imgPath, Buffer.from(part.inlineData.data!, "base64"));
        console.log(`  ✓ Generated: ${filename}`);
        return imgPath;
      }
    }
  } catch (e) {
    console.log(`  ✗ Image generation failed: ${e}`);
  }
  return "";
}

function getStyleColor(style: string): string {
  switch (style) {
    case "hook": return "white";
    case "key-point": return "white";
    case "stat": return "#c9a84c"; // gold
    case "cta": return "#c9a84c";
    default: return "white";
  }
}

function getStyleSize(style: string): number {
  switch (style) {
    case "hook": return 64;
    case "key-point": return 48;
    case "stat": return 52;
    case "cta": return 56;
    default: return 48;
  }
}

async function assembleVideo(slug: string) {
  const projectDir = path.join(SHORTS_DIR, slug);

  if (!fs.existsSync(projectDir)) {
    console.error(`Project not found: ${projectDir}`);
    process.exit(1);
  }

  const scriptPath = path.join(projectDir, "script.json");
  if (!fs.existsSync(scriptPath)) {
    console.error("script.json not found in project folder");
    process.exit(1);
  }

  const script: ShortScript = JSON.parse(fs.readFileSync(scriptPath, "utf-8"));

  // Find voiceover file
  const voiceoverExtensions = [".mp3", ".wav", ".m4a", ".ogg"];
  let voiceoverPath = "";
  for (const ext of voiceoverExtensions) {
    const p = path.join(projectDir, `voiceover${ext}`);
    if (fs.existsSync(p)) {
      voiceoverPath = p;
      break;
    }
  }

  if (!voiceoverPath) {
    console.error("No voiceover file found! Save your recording as voiceover.mp3 in the project folder.");
    process.exit(1);
  }

  console.log("🎬 R2F YouTube Shorts Video Assembler\n");
  console.log(`Project: ${slug}`);
  console.log(`Voiceover: ${path.basename(voiceoverPath)}`);

  // Get audio duration
  const durationOutput = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${voiceoverPath}"`,
    { encoding: "utf-8" }
  ).trim();
  const duration = parseFloat(durationOutput);
  console.log(`Duration: ${duration.toFixed(1)}s\n`);

  // Generate background images for each segment
  console.log("Generating background visuals...");
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const bgImages: string[] = [];
  const visualPrompts = [
    "Professional trading chart with candlesticks showing bullish order block setup, dark navy theme",
    "Abstract financial data visualization with flowing price lines and institutional liquidity zones",
    "Trading desk setup with multiple monitors showing forex charts, dramatic dark lighting",
  ];

  for (let i = 0; i < Math.min(3, visualPrompts.length); i++) {
    const existing = path.join(ASSETS_DIR, `bg-${i}.jpg`);
    if (fs.existsSync(existing)) {
      bgImages.push(existing);
      console.log(`  ✓ Using existing: bg-${i}.jpg`);
    } else {
      const img = await generateBackgroundImage(visualPrompts[i], `bg-${i}.jpg`);
      if (img) bgImages.push(img);
    }
  }

  // Create a solid dark background as fallback
  const solidBg = path.join(projectDir, "solid-bg.png");
  execSync(`ffmpeg -y -f lavfi -i "color=c=0x0d2137:s=1080x1920:d=1" -frames:v 1 "${solidBg}" 2>/dev/null`);

  // Build FFmpeg filter for text overlays
  const overlays = script.textOverlays;
  let filterComplex = "";
  let inputCount = 0;

  // Create base video from background (solid color with duration matching audio)
  const outputPath = path.join(projectDir, "output.mp4");
  const tempVideoPath = path.join(projectDir, "temp-video.mp4");

  // Step 1: Create base video with solid background matching audio duration
  console.log("\nAssembling video...");
  execSync(
    `ffmpeg -y -f lavfi -i "color=c=0x0d2137:s=1080x1920:d=${duration}" -c:v libx264 -t ${duration} -pix_fmt yuv420p "${tempVideoPath}" 2>/dev/null`
  );

  // Step 2: Add text overlays using drawtext filter
  let drawTextFilters: string[] = [];

  // Add R2F watermark (top right)
  drawTextFilters.push(
    `drawtext=text='R2F':fontsize=36:fontcolor=0xc9a84c@0.5:x=w-tw-40:y=40:fontfile=/Windows/Fonts/arialbd.ttf`
  );

  for (const overlay of overlays) {
    const startTime = parseTimestamp(overlay.timestamp);
    const endTime = startTime + 5; // Show each overlay for 5 seconds
    const color = getStyleColor(overlay.style).replace("#", "0x");
    const size = getStyleSize(overlay.style);

    // Escape special characters for FFmpeg
    const escapedText = overlay.text
      .replace(/'/g, "'\\\\\\''")
      .replace(/:/g, "\\:")
      .replace(/\\/g, "\\\\");

    drawTextFilters.push(
      `drawtext=text='${escapedText}':fontsize=${size}:fontcolor=${color}:x=(w-tw)/2:y=(h-th)/2:fontfile=/Windows/Fonts/arialbd.ttf:enable='between(t,${startTime},${endTime})':box=1:boxcolor=0x0d2137@0.7:boxborderw=20`
    );
  }

  // Step 3: Combine video + text overlays + audio
  const filterStr = drawTextFilters.join(",");

  execSync(
    `ffmpeg -y -i "${tempVideoPath}" -i "${voiceoverPath}" -vf "${filterStr}" -c:v libx264 -c:a aac -b:a 128k -shortest -pix_fmt yuv420p "${outputPath}" 2>/dev/null`
  );

  // Clean up temp files
  try { fs.unlinkSync(tempVideoPath); } catch {}
  try { fs.unlinkSync(solidBg); } catch {}

  const fileSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ Video assembled: ${outputPath}`);
  console.log(`📏 Size: ${fileSize} MB`);
  console.log(`⏱️  Duration: ${duration.toFixed(1)}s`);
  console.log(`\n🎯 Next steps:`);
  console.log(`  1. Preview the video: open "${outputPath}"`);
  console.log(`  2. If happy, upload: npm run upload-short "${slug}"`);
}

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: npm run assemble-short <project-slug>");
  console.log("\nAvailable projects:");
  if (fs.existsSync(SHORTS_DIR)) {
    const projects = fs.readdirSync(SHORTS_DIR);
    projects.forEach((p) => console.log(`  - ${p}`));
  }
  process.exit(1);
}

assembleVideo(slug).catch(console.error);
