import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { isCalendlyConfigured, getCalendlyUser, registerCalendlyWebhook } from "@/lib/calendly";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CALLBACK_URL = "https://www.r2ftrading.com/api/webhooks/calendly";

// GET — connection status (presence-only for secrets).
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const hasToken = isCalendlyConfigured();
  const hasSigningKey = !!process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  const user = hasToken ? await getCalendlyUser() : null;
  return NextResponse.json({
    hasToken,
    hasSigningKey,
    tokenWorks: !!user,
    accountName: user?.name || null,
    accountEmail: user?.email || null,
    callbackUrl: CALLBACK_URL,
    ready: hasToken && hasSigningKey && !!user,
  });
}

// POST { action: "register" } — create the webhook subscription, return the
// signing key for the owner to set as CALENDLY_WEBHOOK_SIGNING_KEY.
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { action } = await req.json().catch(() => ({ action: "" }));
  if (action !== "register") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  const result = await registerCalendlyWebhook(CALLBACK_URL);
  return NextResponse.json(result);
}
