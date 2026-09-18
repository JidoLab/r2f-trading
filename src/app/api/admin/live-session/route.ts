import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { verifyAdmin } from "@/lib/admin-auth";
import { updateJsonFile } from "@/lib/github";
import { SESSION_PATH, SESSION_TAG, apply, emptySession, stats, type Action, type LiveSession } from "@/lib/live-session";

/**
 * Admin writes for the stream scoreboard. Body is an Action (see
 * lib/live-session.ts). Each call commits the new session file to the repo,
 * which doubles as the trading journal for the stream.
 */
export const maxDuration = 30;

/**
 * The plan bar doubles as the day's one human post in Discord: when Harvest
 * updates bias / target / waiting-for before or during the stream, the same
 * three lines go to the announcements webhook. Only when something changed
 * and at least one field is filled, so repeated saves do not spam.
 */
async function announcePlan(session: LiveSession, previousPlanKey: string) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  const p = session.plan;
  if (!url || !p || !(p.bias || p.target || p.waiting)) return;
  if (JSON.stringify(p) === previousPlanKey) return;
  const lines = [
    "**Today's plan** (NQ, London session)",
    p.bias ? `Bias: ${p.bias}` : null,
    p.target ? `Target: ${p.target}` : null,
    p.waiting ? `Waiting for: ${p.waiting}` : null,
    "",
    "Watch live: https://www.r2ftrading.com/live",
  ].filter((l) => l !== null);
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: lines.join("\n") }) });
  } catch {
    // Discord being down must never block a save.
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let action: Action;
  try {
    action = (await req.json()) as Action;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  if (!action || !["new", "open", "close", "cancel", "undo", "plan", "rules"].includes(action.type)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  if (action.type === "close" && (typeof action.r !== "number" || !isFinite(action.r) || action.r > 50)) {
    return NextResponse.json({ error: "r must be a number up to 50" }, { status: 400 });
  }

  const label =
    action.type === "close" ? `${action.result} ${action.r}R` :
    action.type === "open" ? `open ${action.side}` :
    action.type === "plan" ? "plan updated" :
    action.type === "rules" ? "rules updated" : action.type;

  let previousPlanKey = "";
  try {
    const session = await updateJsonFile<LiveSession>(
      SESSION_PATH,
      (current) => {
        if (current?.plan) previousPlanKey = JSON.stringify(current.plan);
        return apply(current && current.date ? current : null, action);
      },
      emptySession(),
      `Live session: ${label}`
    );
    revalidateTag(SESSION_TAG, { expire: 0 });
    if (action.type === "plan") await announcePlan(session, previousPlanKey);
    return NextResponse.json({ session, stats: stats(session) });
  } catch (err) {
    // An uncaught throw here would come back as an empty 500, which the panel
    // showed as "Unexpected end of JSON input". Say what actually failed.
    const message = err instanceof Error ? err.message : String(err);
    console.error("live-session write failed:", message);
    return NextResponse.json({ error: `Save failed: ${message.slice(0, 200)}` }, { status: 500 });
  }
}
