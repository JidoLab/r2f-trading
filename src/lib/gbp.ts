/**
 * Google Business Profile (GBP) API utilities.
 * All functions gracefully return null/false when GBP is not configured.
 */

export function isGBPConfigured(): boolean {
  return !!(
    process.env.GBP_ACCOUNT_ID &&
    process.env.GBP_LOCATION_ID &&
    process.env.GBP_REFRESH_TOKEN &&
    process.env.GBP_CLIENT_ID &&
    process.env.GBP_CLIENT_SECRET
  );
}

function getParent(): string {
  return `${process.env.GBP_ACCOUNT_ID}/${process.env.GBP_LOCATION_ID}`;
}

export async function getGBPAccessToken(): Promise<string | null> {
  if (!isGBPConfigured()) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GBP_CLIENT_ID!,
        client_secret: process.env.GBP_CLIENT_SECRET!,
        refresh_token: process.env.GBP_REFRESH_TOKEN!,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const { access_token } = await res.json();
    return access_token;
  } catch {
    return null;
  }
}

export interface GBPPostContent {
  summary: string;
  callToAction?: {
    actionType: "LEARN_MORE" | "BOOK" | "ORDER" | "SHOP" | "SIGN_UP" | "CALL";
    url: string;
  };
}

export async function postToGBP(content: GBPPostContent): Promise<boolean> {
  const token = await getGBPAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${getParent()}/localPosts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          languageCode: "en",
          summary: content.summary,
          topicType: "STANDARD",
          ...(content.callToAction
            ? { callToAction: content.callToAction }
            : {}),
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export interface GoogleReview {
  reviewId: string;
  reviewer: { displayName: string; profilePhotoUrl?: string };
  starRating: string;
  comment: string;
  createTime: string;
  updateTime: string;
  name: string;
  reviewReply?: { comment: string; updateTime: string };
}

export async function getGBPReviews(): Promise<GoogleReview[]> {
  const token = await getGBPAccessToken();
  if (!token) return [];

  try {
    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${getParent()}/reviews?pageSize=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.reviews || []).map((r: Record<string, unknown>) => ({
      reviewId: (r.name as string)?.split("/").pop() || "",
      reviewer: r.reviewer || { displayName: "Anonymous" },
      starRating: r.starRating || "FIVE",
      comment: r.comment || "",
      createTime: r.createTime || "",
      updateTime: r.updateTime || "",
      name: r.name || "",
      reviewReply: r.reviewReply || undefined,
    }));
  } catch {
    return [];
  }
}

export async function replyToGBPReview(
  reviewName: string,
  comment: string
): Promise<boolean> {
  const token = await getGBPAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function uploadPhotoToGBP(
  imageBuffer: Buffer,
  category: string = "ADDITIONAL"
): Promise<boolean> {
  const token = await getGBPAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${getParent()}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mediaFormat: "PHOTO",
          locationAssociation: { category },
          sourceUrl: "", // Would need a public URL
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export interface GBPInsights {
  searchViews: number;
  mapViews: number;
  websiteClicks: number;
  phoneCallClicks: number;
  directionRequests: number;
}

export async function getGBPInsights(): Promise<GBPInsights | null> {
  const token = await getGBPAccessToken();
  if (!token) return null;

  try {
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 86400000);
    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${getParent()}/insights/getMetrics?` +
        new URLSearchParams({
          "metric": "ALL",
          "timeRange.startTime": startDate.toISOString(),
          "timeRange.endTime": endDate.toISOString(),
        }),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Parse metrics from the response
    const metrics = data.locationMetrics?.[0]?.metricValues || [];
    const getValue = (name: string) =>
      metrics.find((m: Record<string, unknown>) => m.metric === name)?.totalValue?.value || 0;
    return {
      searchViews: getValue("QUERIES_DIRECT") + getValue("QUERIES_INDIRECT"),
      mapViews: getValue("VIEWS_MAPS"),
      websiteClicks: getValue("ACTIONS_WEBSITE"),
      phoneCallClicks: getValue("ACTIONS_PHONE"),
      directionRequests: getValue("ACTIONS_DRIVING_DIRECTIONS"),
    };
  } catch {
    return null;
  }
}

// Star rating string to number
export function starRatingToNumber(rating: string): number {
  const map: Record<string, number> = {
    ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
  };
  return map[rating] || 5;
}
