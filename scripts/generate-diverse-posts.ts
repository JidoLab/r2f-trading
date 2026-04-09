/**
 * One-off script: Generate 8 diverse blog posts across different categories.
 * Run with: npx tsx scripts/generate-diverse-posts.ts
 *
 * Uses the same logic as the cron but with hand-picked diverse topics
 * to fill the blog with variety beyond CPI/NFP.
 */

import "dotenv/config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://r2ftrading.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const DIVERSE_TOPICS = [
  // Trading Psychology
  { topic: "5 Signs You're Revenge Trading (And How to Stop)", category: "Trading Psychology", postType: "listicle" },
  // Risk Management
  { topic: "The 1% Rule That Saved My Trading Career", category: "Risk Management", postType: "personal-story" },
  // Beginner Guide
  { topic: "ICT Trading for Complete Beginners: Where to Start", category: "Beginner Guide", postType: "how-to" },
  // Funded Accounts
  { topic: "How I Passed FTMO in 12 Days: The Full Blueprint", category: "Funded Accounts", postType: "case-study" },
  // ICT Concepts (not CPI/NFP)
  { topic: "ICT Killzones Explained: When Smart Money Moves", category: "ICT Concepts", postType: "how-to" },
  // Comparison
  { topic: "Scalping vs Swing Trading with ICT: Which Fits You?", category: "Market Analysis", postType: "comparison" },
  // Psychology
  { topic: "Why Boredom Destroys More Accounts Than Bad Setups", category: "Trading Psychology", postType: "myth-buster" },
  // Risk Management
  { topic: "Position Sizing Cheat Sheet for Funded Traders", category: "Risk Management", postType: "checklist" },
];

async function generatePost(topicData: typeof DIVERSE_TOPICS[0], index: number) {
  console.log(`\n[${index + 1}/${DIVERSE_TOPICS.length}] Generating: "${topicData.topic}"...`);

  try {
    // We'll call the admin posts API which handles the full generation pipeline
    const res = await fetch(`${SITE_URL}/api/admin/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `admin-session=${ADMIN_PASSWORD}`,
      },
      body: JSON.stringify({
        topic: topicData.topic,
        category: topicData.category,
        postType: topicData.postType,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`  ✅ Generated: "${data.title || topicData.topic}"`);
      return true;
    } else {
      const err = await res.text();
      console.log(`  ❌ Failed (${res.status}): ${err.slice(0, 100)}`);
      return false;
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err instanceof Error ? err.message : "unknown"}`);
    return false;
  }
}

async function main() {
  console.log("=== R2F Trading — Diverse Blog Post Generator ===\n");
  console.log(`Generating ${DIVERSE_TOPICS.length} posts across different categories...`);
  console.log(`Target: ${SITE_URL}\n`);

  let succeeded = 0;

  // Generate sequentially to avoid overwhelming the API
  for (let i = 0; i < DIVERSE_TOPICS.length; i++) {
    const ok = await generatePost(DIVERSE_TOPICS[i], i);
    if (ok) succeeded++;

    // Wait 5 seconds between posts to avoid rate limits
    if (i < DIVERSE_TOPICS.length - 1) {
      console.log("  ⏳ Waiting 5s...");
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log(`\n=== Done: ${succeeded}/${DIVERSE_TOPICS.length} posts generated ===`);
}

main().catch(console.error);
