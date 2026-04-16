import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile, listFiles } from "@/lib/github";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const anthropic = new Anthropic();

function extractTitle(content: string): string {
  const match = content.match(/title:\s*["'](.+?)["']/);
  return match ? match[1] : "Trading Article";
}

function extractBody(content: string): string {
  // Find closing } of the metadata export block
  const metaStart = content.indexOf("export const metadata");
  if (metaStart === -1) return content;

  // Walk forward to find the matching closing brace
  let depth = 0;
  let metaEnd = -1;
  for (let i = metaStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) {
        metaEnd = i + 1;
        break;
      }
    }
  }

  if (metaEnd === -1) return content;

  // Return everything after the metadata block
  return content.slice(metaEnd).replace(/^\s+/, "");
}

function hasKeyTakeaway(content: string): boolean {
  return content.includes("> **Key Takeaway");
}

function insertKeyTakeaway(content: string, takeaway: string): string {
  const metaStart = content.indexOf("export const metadata");
  if (metaStart === -1) {
    // No metadata block — prepend
    return `> **Key Takeaway:** ${takeaway}\n\n${content}`;
  }

  // Walk forward to find the matching closing brace of the metadata block
  let depth = 0;
  let metaEnd = -1;
  for (let i = metaStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) {
        metaEnd = i + 1;
        break;
      }
    }
  }

  if (metaEnd === -1) {
    return `${content}\n\n> **Key Takeaway:** ${takeaway}`;
  }

  const beforeBody = content.slice(0, metaEnd);
  const bodyRaw = content.slice(metaEnd).replace(/^\n+/, ""); // strip leading newlines

  // Split body into lines to find first paragraph and first H2
  const lines = bodyRaw.split("\n");
  let firstH2Index = -1;
  let firstParaEndIndex = -1;
  let inFirstPara = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      firstH2Index = i;
      break;
    }

    // Detect end of first paragraph: non-empty line followed by empty line
    if (line.trim() !== "" && !inFirstPara) {
      inFirstPara = true;
    } else if (inFirstPara && line.trim() === "") {
      firstParaEndIndex = i; // index of blank line after first para
      inFirstPara = false;
    }
  }

  const takeawayBlock = `> **Key Takeaway:** ${takeaway}`;

  // Insertion strategy: after first paragraph (before first H2), or after metadata
  if (firstParaEndIndex !== -1) {
    // Insert after the blank line that ends the first paragraph
    const insertAt = firstParaEndIndex + 1;
    const before = lines.slice(0, insertAt).join("\n");
    const after = lines.slice(insertAt).join("\n");
    const bodyWithTakeaway = `${before}\n${takeawayBlock}\n\n${after}`;
    return `${beforeBody}\n\n${bodyWithTakeaway}`;
  } else if (firstH2Index !== -1) {
    // No clear first paragraph — insert right before the first H2
    const before = lines.slice(0, firstH2Index).join("\n").trimEnd();
    const after = lines.slice(firstH2Index).join("\n");
    const bodyWithTakeaway = `${before}\n\n${takeawayBlock}\n\n${after}`;
    return `${beforeBody}\n\n${bodyWithTakeaway}`;
  } else {
    // Fallback: just append after metadata with a blank line
    return `${beforeBody}\n\n${takeawayBlock}\n\n${bodyRaw}`;
  }
}

async function generateTakeaway(
  title: string,
  bodySnippet: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `You are writing a "Key Takeaway" callout for a trading education blog post.

Title: ${title}

Article excerpt:
${bodySnippet}

Write a single 1-2 sentence Key Takeaway that captures the core actionable insight from this article. Be specific, practical, and direct. Do not start with "The key takeaway is" or similar preamble. Just write the insight itself.`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected Claude response type");
  return block.text.trim().replace(/\n/g, " ");
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let limit = 10;
  try {
    const body = await req.json();
    if (typeof body?.limit === "number" && body.limit > 0) {
      limit = body.limit;
    }
  } catch {
    // No body or invalid JSON — use default
  }

  const results: { file: string; status: "updated" | "skipped" | "error"; reason?: string }[] = [];

  try {
    const files = await listFiles("content/blog", ".mdx");

    const toProcess = files.slice(0, limit);

    for (const filePath of toProcess) {
      try {
        const content = await readFile(filePath);

        if (hasKeyTakeaway(content)) {
          results.push({ file: filePath, status: "skipped", reason: "already has Key Takeaway" });
          continue;
        }

        const body = extractBody(content);

        if (body.length < 200) {
          results.push({ file: filePath, status: "skipped", reason: "body too short" });
          continue;
        }

        const title = extractTitle(content);
        const bodySnippet = body.slice(0, 500);

        const takeaway = await generateTakeaway(title, bodySnippet);
        const updated = insertKeyTakeaway(content, takeaway);

        await commitFile(filePath, updated, `Add Key Takeaway to ${filePath.split("/").pop()}`);

        results.push({ file: filePath, status: "updated" });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.push({ file: filePath, status: "error", reason: msg });
      }
    }

    const updatedCount = results.filter((r) => r.status === "updated").length;
    const skippedCount = results.filter((r) => r.status === "skipped").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount,
      total: results.length,
      details: results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process posts";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
