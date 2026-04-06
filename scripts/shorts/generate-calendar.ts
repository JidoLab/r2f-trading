import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

async function main() {
  const { generateContentCalendar } = await import("../../src/lib/content-calendar.js");
  await generateContentCalendar(30);
  console.log("✅ 30-day content calendar generated");
}

main().catch(console.error);
