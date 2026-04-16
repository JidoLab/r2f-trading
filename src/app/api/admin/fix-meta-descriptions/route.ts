import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { listFiles, readFile, commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const limit = body.limit || 10;

  const files = await listFiles("content/blog", ".mdx");
  const results: { file: string; status: string; reason?: string }[] = [];
  let updated = 0;

  const anthropic = new Anthropic();

  for (const filePath of files.slice(0, limit + 30)) {
    if (updated >= limit) break;

    try {
      const content = await readFile(filePath);

      // Extract metadata block
      const metaMatch = content.match(/export\s+const\s+metadata\s*=\s*(\{[\s\S]*?\n\})/);
      if (!metaMatch) {
        results.push({ file: filePath, status: "skipped", reason: "no metadata block" });
        continue;
      }

      let meta: Record<string, unknown>;
      try {
        meta = new Function(`return ${metaMatch[1]}`)() as Record<string, unknown>;
      } catch {
        results.push({ file: filePath, status: "skipped", reason: "parse error" });
        continue;
      }

      const desc = (meta.seoDescription as string) || "";
      const title = (meta.title as string) || "";

      // Check if fix needed
      const needsFix =
        desc.length > 160 ||
        desc.length < 80 ||
        !desc ||
        /^(Discover|Learn|Master|Find out|Complete guide)/i.test(desc);

      if (!needsFix) {
        results.push({ file: filePath, status: "skipped", reason: "description OK" });
        continue;
      }

      // Generate improved description
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Write a meta description for this blog post. Rules:
- MUST be 130-155 characters (this is critical — Google truncates at 160)
- Start with an action verb or specific claim (NOT "Discover", "Learn", "Master", "Find out", or "Complete guide")
- Include the primary keyword naturally
- End with a subtle CTA or value hook
- Be specific to THIS article, not generic

Title: "${title}"
Current description (fix this): "${desc}"

Return ONLY the new meta description text, nothing else.`,
        }],
      });

      const newDesc = (response.content[0].type === "text" ? response.content[0].text : "").trim().replace(/^["']|["']$/g, "");

      if (newDesc.length < 80 || newDesc.length > 160) {
        results.push({ file: filePath, status: "skipped", reason: `generated desc bad length: ${newDesc.length}` });
        continue;
      }

      // Replace in content
      const oldDescEscaped = desc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const newContent = content.replace(
        new RegExp(`seoDescription:\\s*["'\`]${oldDescEscaped}["'\`]`),
        `seoDescription: ${JSON.stringify(newDesc)}`
      );

      if (newContent === content) {
        // Try alternate replacement for multiline or complex strings
        const newContent2 = content.replace(
          `seoDescription: ${JSON.stringify(desc)}`,
          `seoDescription: ${JSON.stringify(newDesc)}`
        );
        if (newContent2 === content) {
          results.push({ file: filePath, status: "skipped", reason: "replacement failed" });
          continue;
        }
        await commitFile(filePath, newContent2, `Fix meta description: ${title}`);
      } else {
        await commitFile(filePath, newContent, `Fix meta description: ${title}`);
      }

      updated++;
      results.push({ file: filePath, status: "updated" });
    } catch (err) {
      results.push({ file: filePath, status: "error", reason: String(err) });
    }
  }

  return NextResponse.json({ updated, total: results.length, details: results });
}
