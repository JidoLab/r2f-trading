import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// --- Config ---
const CONTENT_DIR = path.join(process.cwd(), "content", "blog");
const IMAGE_DIR = path.join(process.cwd(), "public", "blog");
const HISTORY_FILE = path.join(__dirname, ".topic-history.json");

const TOPIC_MATRIX = [
  {
    category: "ICT Concepts",
    topics: [
      "Understanding Fair Value Gaps and How to Trade Them",
      "Liquidity Sweeps: How Smart Money Hunts Stop Losses",
      "Market Structure Shifts Explained for ICT Traders",
      "How to Use ICT Killzones for Optimal Entry Timing",
      "The Power of Breaker Blocks in ICT Trading",
      "ICT Optimal Trade Entry: Finding High-Probability Setups",
      "Understanding Displacement and How It Signals Institutional Activity",
    ],
  },
  {
    category: "Trading Psychology",
    topics: [
      "Why Most Traders Fail: The Psychology Behind Consistent Losses",
      "Building a Winning Mindset: Mental Frameworks for Traders",
      "How to Handle Losing Streaks Without Blowing Your Account",
      "The Role of Patience in Profitable Trading",
      "Overcoming Fear of Missing Out (FOMO) in Trading",
      "Emotional Detachment: Trading Like a Professional",
      "Journal Your Way to Profits: The Power of Trade Journaling",
    ],
  },
  {
    category: "Risk Management",
    topics: [
      "Position Sizing: The Most Important Skill No One Teaches",
      "Risk-to-Reward Ratios: What Actually Matters",
      "How to Protect Your Funded Account from Drawdown",
      "Building a Risk Management Plan That Actually Works",
      "The 1% Rule and Why It Transforms Your Trading",
      "Scaling In and Out of Positions: A Practical Guide",
    ],
  },
  {
    category: "Funded Accounts",
    topics: [
      "How to Pass Your First Prop Firm Challenge",
      "FTMO vs Other Prop Firms: What to Consider",
      "Common Mistakes That Fail Funded Account Challenges",
      "Managing a Funded Account Like a Business",
      "From Prop Firm Challenge to Consistent Payouts: A Roadmap",
      "The Truth About Funded Trading: What They Don't Tell You",
    ],
  },
  {
    category: "Market Analysis",
    topics: [
      "How to Read Price Action Like an Institutional Trader",
      "Multi-Timeframe Analysis: A Step-by-Step Approach",
      "Understanding Forex Sessions and Their Impact on Volatility",
      "Gold (XAUUSD) Trading Strategies Using ICT Concepts",
      "How Economic Events Affect Your ICT Setups",
      "Reading Candlestick Patterns Through the ICT Lens",
    ],
  },
];

function loadHistory(): string[] {
  if (fs.existsSync(HISTORY_FILE)) {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  }
  return [];
}

function saveHistory(history: string[]) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function pickTopic(history: string[]): { category: string; topic: string } {
  const allTopics = TOPIC_MATRIX.flatMap((cat) =>
    cat.topics.map((t) => ({ category: cat.category, topic: t }))
  );
  const unused = allTopics.filter((t) => !history.includes(t.topic));
  const pool = unused.length > 0 ? unused : allTopics;
  return pool[Math.floor(Math.random() * pool.length)];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateArticle(topic: string, category: string): Promise<{
  title: string;
  excerpt: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  body: string;
  imagePrompts: string[];
}> {
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 5000,
    messages: [
      {
        role: "user",
        content: `Write a blog article for R2F Trading (Road 2 Funded), a professional ICT trading coaching website run by Harvest, a mentor with 10+ years of experience.

Topic: "${topic}"
Category: ${category}

Website URL: www.road2fundedtrading.com

CONTENT REQUIREMENTS:
- Write 1000-1500 words of high-quality, SEO-optimized content
- Use markdown formatting with ## and ### headers, bullet points, bold text, and blockquotes
- Include 2-3 natural internal links woven into the content:
  - Link to [coaching plans](/coaching) when mentioning learning or structured programs
  - Link to [book a free discovery call](/contact) when mentioning getting help or next steps
  - Link to [trading insights](/trading-insights) when referencing other educational content
- Write in first person as Harvest, an experienced ICT trader and mentor
- Be educational but accessible — explain all ICT jargon
- Include actionable takeaways readers can apply immediately
- Use short paragraphs (2-3 sentences max) for readability
- End with a compelling call-to-action

SEO REQUIREMENTS:
- Title: 50-60 characters, include primary keyword near the start
- Meta description: 150-155 characters, compelling with a call-to-action feel
- Include 3-5 SEO keywords relevant to ICT trading audience
- Structure headers with H2/H3 for featured snippet potential
- seoTitle can differ from the article title (optimized for search)

IMAGE PLACEMENT:
- Provide exactly 2 image prompts for illustrations to be placed within the article
- Each prompt should describe a trading-related illustration (chart patterns, concept diagrams, trading setups)
- Mark where images go in the body with: ![image-1-alt-text](IMAGE_1) and ![image-2-alt-text](IMAGE_2)

Return ONLY a JSON object (no markdown code fences) with these fields:
{
  "title": "Article display title",
  "seoTitle": "SEO-optimized page title with primary keyword (50-60 chars)",
  "excerpt": "Compelling excerpt for blog cards (100-120 chars)",
  "seoDescription": "Meta description for search engines (150-155 chars)",
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "tags": ["tag1", "tag2", "tag3"],
  "body": "The full article in markdown with IMAGE_1 and IMAGE_2 placeholders",
  "imagePrompts": ["Prompt for image 1", "Prompt for image 2"]
}`,
      },
    ],
  });

  let text = response.content[0].type === "text" ? response.content[0].text : "";
  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  return JSON.parse(text);
}

async function generateImage(
  prompt: string,
  filename: string,
  apiKey: string
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: `${prompt}. Style: Clean, professional, modern design with a dark navy (#0d2137) and gold (#c9a84c) color scheme. No text overlays on the image.`,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData) {
        const imgPath = path.join(IMAGE_DIR, filename);
        const buffer = Buffer.from(part.inlineData.data!, "base64");
        fs.writeFileSync(imgPath, buffer);
        console.log(`  Saved: public/blog/${filename}`);
        return `/blog/${filename}`;
      }
    }
    console.log(`  No image data returned for ${filename}`);
    return "";
  } catch (err) {
    console.log(`  Image generation failed for ${filename}: ${err}`);
    return "";
  }
}

async function main() {
  console.log("R2F Trading Blog Generator\n");

  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  fs.mkdirSync(IMAGE_DIR, { recursive: true });

  // Pick topic
  const history = loadHistory();
  const { category, topic } = pickTopic(history);
  console.log(`Category: ${category}`);
  console.log(`Topic: ${topic}\n`);

  // Generate article
  console.log("Generating article with Claude...");
  const article = await generateArticle(topic, category);
  console.log(`  Title: ${article.title}`);
  console.log(`  SEO Title: ${article.seoTitle}`);
  console.log(`  Keywords: ${article.seoKeywords.join(", ")}`);

  // Generate slug
  const date = new Date().toISOString().split("T")[0];
  const slug = `${date}-${slugify(article.title)}`;

  // Generate images (cover + 2 in-article)
  const apiKey = process.env.GEMINI_API_KEY;

  console.log("\nGenerating images with Gemini...");

  let coverImage = "";
  let img1Path = "";
  let img2Path = "";

  if (apiKey) {
    // Generate all images in parallel
    const [cover, img1, img2] = await Promise.all([
      generateImage(
        `Professional blog cover image for a trading article: "${article.title}". Landscape 16:9 ratio, abstract financial/trading theme with candlestick charts`,
        `${slug}-cover.jpg`,
        apiKey
      ),
      article.imagePrompts[0]
        ? generateImage(article.imagePrompts[0], `${slug}-img1.jpg`, apiKey)
        : Promise.resolve(""),
      article.imagePrompts[1]
        ? generateImage(article.imagePrompts[1], `${slug}-img2.jpg`, apiKey)
        : Promise.resolve(""),
    ]);
    coverImage = cover;
    img1Path = img1;
    img2Path = img2;
  } else {
    console.log("  No GEMINI_API_KEY found, skipping all image generation");
  }

  // Replace image placeholders in body
  let body = article.body;
  if (img1Path) {
    body = body.replace(/\(IMAGE_1\)/, `(${img1Path})`);
  } else {
    // Remove the image markdown line if no image was generated
    body = body.replace(/!\[.*?\]\(IMAGE_1\)\n?/, "");
  }
  if (img2Path) {
    body = body.replace(/\(IMAGE_2\)/, `(${img2Path})`);
  } else {
    body = body.replace(/!\[.*?\]\(IMAGE_2\)\n?/, "");
  }

  // Assemble MDX file with full SEO metadata
  const mdxContent = `export const metadata = {
  title: ${JSON.stringify(article.title)},
  seoTitle: ${JSON.stringify(article.seoTitle)},
  date: "${date}",
  excerpt: ${JSON.stringify(article.excerpt)},
  seoDescription: ${JSON.stringify(article.seoDescription)},
  seoKeywords: ${JSON.stringify(article.seoKeywords)},
  coverImage: ${JSON.stringify(coverImage)},
  tags: ${JSON.stringify(article.tags)},
}

${body}
`;

  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  fs.writeFileSync(filePath, mdxContent);
  console.log(`\nPost saved to: content/blog/${slug}.mdx`);
  console.log("Review and edit before deploying.\n");

  // Update history
  history.push(topic);
  saveHistory(history);

  console.log("Done!");
}

main().catch(console.error);
