import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getAllPosts } from "@/lib/blog";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posts = getAllPosts();
  return NextResponse.json({ posts });
}

export async function POST() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const output = execSync("npx tsx scripts/generate-post.ts", {
      cwd: process.cwd(),
      timeout: 120000,
      encoding: "utf-8",
      env: { ...process.env },
    });

    // Parse output for results
    const titleMatch = output.match(/Title: (.+)/);
    const categoryMatch = output.match(/Category: (.+)/);
    const topicMatch = output.match(/Topic: (.+)/);
    const savedMatch = output.match(/content\/blog\/(.+)\.mdx/);
    const imageCount = (output.match(/Saved: /g) || []).length;

    return NextResponse.json({
      success: true,
      title: titleMatch?.[1] || "Generated post",
      category: categoryMatch?.[1] || "",
      topic: topicMatch?.[1] || "",
      slug: savedMatch?.[1] || "",
      imageCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
