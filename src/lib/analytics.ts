/**
 * GA4 Data API Integration
 *
 * Pulls real analytics data from Google Analytics 4 via the Data API v1.
 * Requires:
 *   GA4_PROPERTY_ID       — e.g. "properties/123456789"
 *   GOOGLE_SERVICE_ACCOUNT_KEY — the full JSON key file contents
 *
 * If either env var is missing, all functions return null so callers can
 * fall back to placeholder / empty data.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsOverview {
  /** Total active users in the period */
  users: number;
  /** Total sessions */
  sessions: number;
  /** Total page views */
  pageViews: number;
  /** Bounce rate as a decimal (0–1) */
  bounceRate: number;
  /** Average session duration in seconds */
  avgSessionDuration: number;
}

export interface PageViewRow {
  pagePath: string;
  pageTitle: string;
  views: number;
  avgDuration: number;
}

export interface TrafficSourceRow {
  source: string;
  medium: string;
  sessions: number;
  users: number;
}

export interface DailyMetric {
  date: string; // YYYY-MM-DD
  users: number;
  pageViews: number;
  sessions: number;
}

export interface AnalyticsData {
  overview7d: AnalyticsOverview;
  overview30d: AnalyticsOverview;
  dailyMetrics: DailyMetric[];
  topPages: PageViewRow[];
  trafficSources: TrafficSourceRow[];
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function getConfig(): { propertyId: string; serviceAccountKey: Record<string, string> } | null {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!propertyId || !keyJson) return null;

  try {
    const serviceAccountKey = JSON.parse(keyJson);
    return { propertyId, serviceAccountKey };
  } catch {
    console.error("[analytics] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY");
    return null;
  }
}

export function isAnalyticsConfigured(): boolean {
  return getConfig() !== null;
}

// ---------------------------------------------------------------------------
// JWT / Auth — minimal implementation, no external deps
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
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Use Node.js crypto to sign with the private key
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
      console.error("[analytics] Token exchange failed:", await res.text());
      return null;
    }
    const data = await res.json();
    return data.access_token ?? null;
  } catch (err) {
    console.error("[analytics] Auth error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// GA4 Data API helpers
// ---------------------------------------------------------------------------

interface RunReportRequest {
  dateRanges: { startDate: string; endDate: string }[];
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  limit?: number;
  orderBys?: { metric?: { metricName: string }; desc?: boolean }[];
}

interface RunReportResponse {
  rows?: {
    dimensionValues?: { value: string }[];
    metricValues?: { value: string }[];
  }[];
  rowCount?: number;
}

async function runReport(
  propertyId: string,
  accessToken: string,
  request: RunReportRequest,
): Promise<RunReportResponse | null> {
  const url = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`;
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
      console.error("[analytics] runReport failed:", res.status, await res.text());
      return null;
    }
    return (await res.json()) as RunReportResponse;
  } catch (err) {
    console.error("[analytics] runReport error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helper to format dates
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
// Fetch overview metrics for a date range
// ---------------------------------------------------------------------------

async function fetchOverview(
  propertyId: string,
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<AnalyticsOverview> {
  const report = await runReport(propertyId, accessToken, {
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
    ],
  });

  if (!report?.rows?.[0]) {
    return { users: 0, sessions: 0, pageViews: 0, bounceRate: 0, avgSessionDuration: 0 };
  }

  const vals = report.rows[0].metricValues ?? [];
  return {
    users: parseInt(vals[0]?.value ?? "0", 10),
    sessions: parseInt(vals[1]?.value ?? "0", 10),
    pageViews: parseInt(vals[2]?.value ?? "0", 10),
    bounceRate: parseFloat(vals[3]?.value ?? "0"),
    avgSessionDuration: parseFloat(vals[4]?.value ?? "0"),
  };
}

// ---------------------------------------------------------------------------
// Public: get all analytics data
// ---------------------------------------------------------------------------

export async function getAnalyticsData(): Promise<AnalyticsData | null> {
  const config = getConfig();
  if (!config) return null;

  const accessToken = await getAccessToken(config.serviceAccountKey);
  if (!accessToken) return null;

  const today = formatDate(new Date());
  const sevenAgo = daysAgo(7);
  const thirtyAgo = daysAgo(30);

  // Run all queries in parallel
  const [overview7d, overview30d, dailyReport, pagesReport, sourcesReport] =
    await Promise.all([
      fetchOverview(config.propertyId, accessToken, sevenAgo, today),
      fetchOverview(config.propertyId, accessToken, thirtyAgo, today),

      // Daily metrics (last 30 days)
      runReport(config.propertyId, accessToken, {
        dateRanges: [{ startDate: thirtyAgo, endDate: today }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "sessions" },
        ],
        limit: 31,
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: false }],
      }),

      // Top pages
      runReport(config.propertyId, accessToken, {
        dateRanges: [{ startDate: thirtyAgo, endDate: today }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
        ],
        limit: 20,
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      }),

      // Traffic sources
      runReport(config.propertyId, accessToken, {
        dateRanges: [{ startDate: thirtyAgo, endDate: today }],
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        limit: 20,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }),
    ]);

  // Parse daily metrics
  const dailyMetrics: DailyMetric[] = (dailyReport?.rows ?? [])
    .map((row) => {
      const rawDate = row.dimensionValues?.[0]?.value ?? "";
      // GA4 returns dates as YYYYMMDD
      const date = rawDate.length === 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : rawDate;
      const vals = row.metricValues ?? [];
      return {
        date,
        users: parseInt(vals[0]?.value ?? "0", 10),
        pageViews: parseInt(vals[1]?.value ?? "0", 10),
        sessions: parseInt(vals[2]?.value ?? "0", 10),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Parse top pages
  const topPages: PageViewRow[] = (pagesReport?.rows ?? []).map((row) => {
    const dims = row.dimensionValues ?? [];
    const vals = row.metricValues ?? [];
    return {
      pagePath: dims[0]?.value ?? "",
      pageTitle: dims[1]?.value ?? "",
      views: parseInt(vals[0]?.value ?? "0", 10),
      avgDuration: parseFloat(vals[1]?.value ?? "0"),
    };
  });

  // Parse traffic sources
  const trafficSources: TrafficSourceRow[] = (sourcesReport?.rows ?? []).map(
    (row) => {
      const dims = row.dimensionValues ?? [];
      const vals = row.metricValues ?? [];
      return {
        source: dims[0]?.value ?? "(direct)",
        medium: dims[1]?.value ?? "(none)",
        sessions: parseInt(vals[0]?.value ?? "0", 10),
        users: parseInt(vals[1]?.value ?? "0", 10),
      };
    },
  );

  return {
    overview7d,
    overview30d,
    dailyMetrics,
    topPages,
    trafficSources,
  };
}
