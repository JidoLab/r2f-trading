import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { isGSCConfigured, getSearchQueries } from "@/lib/search-console";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Diagnostic: report exactly what's configured for Google Search Console and
// try a real query. Surfaces the service-account email (so the owner knows
// which account to grant GSC access to) and a clear next step. Presence-only
// for secrets — never returns the key value.
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const hasSiteUrl = !!process.env.GSC_SITE_URL;
  const siteUrl = process.env.GSC_SITE_URL || null;

  let keyParses = false;
  let clientEmail: string | null = null;
  let projectId: string | null = null;
  if (hasKey) {
    try {
      const k = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY as string);
      keyParses = true;
      clientEmail = k.client_email || null;
      projectId = k.project_id || null;
    } catch {
      keyParses = false;
    }
  }

  const result: Record<string, unknown> = {
    hasKey,
    keyParses,
    clientEmail,
    projectId,
    hasSiteUrl,
    siteUrl,
    configured: isGSCConfigured(),
  };

  if (!isGSCConfigured()) {
    result.ok = false;
    result.next = !hasKey
      ? "No env var named exactly GOOGLE_SERVICE_ACCOUNT_KEY. If your existing key is under a different name, rename/duplicate it to GOOGLE_SERVICE_ACCOUNT_KEY (or tell me its name and I'll point the code at it), then redeploy."
      : !keyParses
      ? "GOOGLE_SERVICE_ACCOUNT_KEY is present but not valid JSON (often pasted into the Notes field, or truncated). Re-paste the full JSON into the Value field and redeploy."
      : !hasSiteUrl
      ? "Key looks good. Add GSC_SITE_URL (sc-domain:r2ftrading.com for a Domain property, or https://www.r2ftrading.com/ with trailing slash for a URL-prefix property) and redeploy."
      : "Not configured.";
    return NextResponse.json(result);
  }

  // Fully configured — attempt a real fetch.
  try {
    const data = await getSearchQueries();
    if (!data) {
      result.ok = false;
      result.next = `Configured, but the API returned no data. Most likely one of: (1) the "Google Search Console API" is not enabled in project ${projectId || "(this service account's project)"}, (2) ${clientEmail || "the service-account email"} has not been added as a user on the Search Console property, or (3) GSC_SITE_URL does not exactly match a verified property.`;
    } else {
      result.ok = true;
      result.totalImpressions = data.totalImpressions;
      result.totalClicks = data.totalClicks;
      result.sampleQueries = data.topQueries.slice(0, 5).map((q) => q.query);
      result.contentGapCount = data.contentGaps.length;
      result.next = "Connected. The weekly miner will now feed your Topic Queue automatically.";
    }
  } catch (e) {
    result.ok = false;
    result.error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(result);
}
