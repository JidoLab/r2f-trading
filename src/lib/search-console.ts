/**
 * Google Search Console API Integration
 *
 * Pulls search analytics data from GSC via the Search Analytics API.
 * Requires:
 *   GSC_SITE_URL              — e.g. "https://r2ftrading.com" or "sc-domain:r2ftrading.com"
 *   GOOGLE_SERVICE_ACCOUNT_KEY — the full JSON key file contents (shared with GA4)
 *
 * If either env var is missing, all functions return null so callers can
 * fall back to placeholder / empty data.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface ContentGap {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  opportunity: "high" | "medium";
}

export interface SearchConsoleData {
  topQueries: SearchQuery[];
  topPages: SearchPage[];
  contentGaps: ContentGap[];
  dateRange: { start: string; end: string };
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getConfig(): { siteUrl: string; serviceAccountKey: Record<string, string> } | null {
  const siteUrl = process.env.GSC_SITE_URL;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!siteUrl || !keyJson) return null;

  try {
    const serviceAccountKey = JSON.parse(keyJson);
    return { siteUrl, serviceAccountKey };
  } catch {
    console.error("[search-console] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY");
    return null;
  }
}

export function isGSCConfigured(): boolean {
  return getConfig() !== null;
}

// ---------------------------------------------------------------------------
// JWT / Auth — same pattern as analytics.ts
// ---------------------------------------------------------------------------

function base64url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createJwt(
  serviceAccountKey: Record<string, string>,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const crypto = await import("crypto");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsignedToken);
  const signature = sign
    .sign(serviceAccountKey.private_key, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${unsignedToken}.${signature}`;
}

async function getAccessToken(
  serviceAccountKey: Record<string, string>,
): Promise<string | null> {
  try {
    const jwt = await createJwt(serviceAccountKey);
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!res.ok) {
      console.error("[search-console] Token exchange failed:", await res.text());
      return null;
    }
    const data = await res.json();
    return data.access_token ?? null;
  } catch (err) {
    console.error("[search-console] Auth error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDate(d);
}

// ---------------------------------------------------------------------------
// Search Analytics API
// ---------------------------------------------------------------------------

interface SearchAnalyticsRequest {
  startDate: string;
  endDate: string;
  dimensions: string[];
  rowLimit?: number;
  startRow?: number;
  dimensionFilterGroups?: Array<{
    filters: Array<{
      dimension: string;
      operator: string;
      expression: string;
    }>;
  }>;
}

interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SearchAnalyticsResponse {
  rows?: SearchAnalyticsRow[];
  responseAggregationType?: string;
}

async function querySearchAnalytics(
  siteUrl: string,
  accessToken: string,
  request: SearchAnalyticsRequest,
): Promise<SearchAnalyticsResponse | null> {
  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      console.error("[search-console] Query failed:", res.status, await res.text());
      return null;
    }
    return (await res.json()) as SearchAnalyticsResponse;
  } catch (err) {
    console.error("[search-console] Query error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public: Get search queries
// ---------------------------------------------------------------------------

export async function getSearchQueries(
  dateRange: { start: string; end: string } = { start: daysAgo(28), end: daysAgo(1) },
): Promise<SearchConsoleData | null> {
  const config = getConfig();
  if (!config) return null;

  const accessToken = await getAccessToken(config.serviceAccountKey);
  if (!accessToken) return null;

  // Run queries and pages in parallel
  const [queriesReport, pagesReport] = await Promise.all([
    querySearchAnalytics(config.siteUrl, accessToken, {
      startDate: dateRange.start,
      endDate: dateRange.end,
      dimensions: ["query"],
      rowLimit: 100,
    }),
    querySearchAnalytics(config.siteUrl, accessToken, {
      startDate: dateRange.start,
      endDate: dateRange.end,
      dimensions: ["page"],
      rowLimit: 50,
    }),
  ]);

  const topQueries: SearchQuery[] = (queriesReport?.rows ?? []).map((row) => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Math.round(row.ctr * 10000) / 100, // to percentage
    position: Math.round(row.position * 10) / 10,
  }));

  const topPages: SearchPage[] = (pagesReport?.rows ?? []).map((row) => ({
    page: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Math.round(row.ctr * 10000) / 100,
    position: Math.round(row.position * 10) / 10,
  }));

  // Aggregate totals
  const totalClicks = topQueries.reduce((sum, q) => sum + q.clicks, 0);
  const totalImpressions = topQueries.reduce((sum, q) => sum + q.impressions, 0);
  const avgCtr = totalImpressions > 0
    ? Math.round((totalClicks / totalImpressions) * 10000) / 100
    : 0;
  const avgPosition = topQueries.length > 0
    ? Math.round((topQueries.reduce((sum, q) => sum + q.position, 0) / topQueries.length) * 10) / 10
    : 0;

  const contentGaps = getContentGapsFromQueries(topQueries);

  return {
    topQueries,
    topPages,
    contentGaps,
    dateRange,
    totalClicks,
    totalImpressions,
    avgCtr,
    avgPosition,
  };
}

// ---------------------------------------------------------------------------
// Public: Get content gaps (queries ranking on page 2)
// ---------------------------------------------------------------------------

export function getContentGapsFromQueries(queries: SearchQuery[]): ContentGap[] {
  return queries
    .filter((q) => q.position >= 8 && q.position <= 20 && q.impressions >= 5)
    .map((q) => ({
      query: q.query,
      impressions: q.impressions,
      clicks: q.clicks,
      ctr: q.ctr,
      position: q.position,
      opportunity: q.position <= 15 && q.impressions >= 20 ? "high" as const : "medium" as const,
    }))
    .sort((a, b) => {
      if (a.opportunity !== b.opportunity) return a.opportunity === "high" ? -1 : 1;
      return b.impressions - a.impressions;
    });
}

export async function getContentGaps(): Promise<ContentGap[] | null> {
  const data = await getSearchQueries();
  if (!data) return null;
  return data.contentGaps;
}
