import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile } from "@/lib/github";
import { generateThread, postThread } from "@/lib/twitter-threads";

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await req.json();
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    // Read the MDX file from GitHub
    const mdxContent = await readFile(`content/blog/${slug}.mdx`);

    // Extract title from metadata
    const titleMatch = mdxContent.match(/title:\s*"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : slug;

    // Extract body — everything after the metadata export block
    const bodyMatch = mdxContent.match(/^export const metadata[\s\S]*?^}\s*\n([\s\S]+)/m);
    const body = bodyMatch ? bodyMatch[1].trim() : mdxContent;

    // Generate thread using Claude
    const tweets = await generateThread(title, body, slug);

    // Post to Twitter/X
    const result = await postThread(tweets);

    return NextResponse.json({
      success: result.success,
      tweets,
      tweetIds: result.tweetIds,
      threadUrl: result.tweetIds[0]
        ? `https://twitter.com/Road2Funded/status/${result.tweetIds[0]}`
        : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Thread generation failed";
    console.error("[admin/threads] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
