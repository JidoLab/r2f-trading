import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { updateJsonFile } from "@/lib/github";
import { SESSION_PATH, apply, emptySession, stats, type Action, type LiveSession } from "@/lib/live-session";

/**
 * Admin writes for the stream scoreboard. Body is an Action (see
 * lib/live-session.ts). Each call commits the new session file to the repo,
 * which doubles as the trading journal for the stream.
 */
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let action: Action;
  try {
    action = (await req.json()) as Action;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  if (!action || !["new", "open", "close", "cancel", "undo", "plan"].includes(action.type)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  if (action.type === "close" && (typeof action.r !== "number" || !isFinite(action.r) || action.r > 50)) {
    return NextResponse.json({ error: "r must be a number up to 50" }, { status: 400 });
  }

  const label =
    action.type === "close" ? `${action.result} ${action.r}R` :
    action.type === "open" ? `open ${action.side}` :
    action.type === "plan" ? "plan updated" : action.type;

  try {
    const session = await updateJsonFile<LiveSession>(
      SESSION_PATH,
      (current) => apply(current && current.date ? current : null, action),
      emptySession(),
      `Live session: ${label}`
    );
    return NextResponse.json({ session, stats: stats(session) });
  } catch (err) {
    // An uncaught throw here would come back as an empty 500, which the panel
    // showed as "Unexpected end of JSON input". Say what actually failed.
    const message = err instanceof Error ? err.message : String(err);
    console.error("live-session write failed:", message);
    return NextResponse.json({ error: `Save failed: ${message.slice(0, 200)}` }, { status: 500 });
  }
}
