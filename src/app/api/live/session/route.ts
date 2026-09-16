import { NextResponse } from "next/server";
import { readFile } from "@/lib/github";
import { SESSION_PATH, emptySession, stats, type LiveSession } from "@/lib/live-session";

/**
 * Public read of the current stream session, polled by /live/overlay every few
 * seconds while XSplit has it on screen. No auth: the numbers are on the
 * stream anyway. Never cached, so a logged trade shows within one poll.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  let session: LiveSession;
  try {
    session = JSON.parse(await readFile(SESSION_PATH));
  } catch {
    session = emptySession();
  }
  return NextResponse.json(
    { session, stats: stats(session) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
