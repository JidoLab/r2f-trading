import { NextResponse } from "next/server";
import { readSessionCached, stats } from "@/lib/live-session";

/**
 * Public read of the current stream session, polled by /live/overlay every few
 * seconds while XSplit has it on screen. No auth: the numbers are on the
 * stream anyway. The response is never cached, but the GitHub read behind it
 * is (5 s, tag-invalidated on write) so polling cannot exhaust the API quota.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSessionCached();
  return NextResponse.json(
    { session, stats: stats(session) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
