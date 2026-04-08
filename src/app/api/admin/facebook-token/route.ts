import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export const maxDuration = 30;

/**
 * Facebook Token Management
 *
 * GET: Check current token status
 * POST: Exchange a short-lived token for a long-lived page token
 *
 * Flow:
 * 1. Go to https://developers.facebook.com/tools/explorer/
 * 2. Select your app, select "Get Page Access Token"
 * 3. Grant permissions: pages_manage_posts, pages_read_engagement, pages_show_list
 * 4. Copy the short-lived token
 * 5. POST it here with your App ID + App Secret to get a long-lived token
 * 6. Update FACEBOOK_PAGE_ACCESS_TOKEN in Vercel env vars
 */

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!token || !pageId) {
    return NextResponse.json({ status: "missing", message: "No Facebook credentials configured" });
  }

  // Check if current token is valid
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${token}`
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({
        status: "expired",
        error: data.error.message,
        fix: "Go to https://developers.facebook.com/tools/explorer/ → Get Page Access Token → Copy token → POST it to this endpoint with appId and appSecret",
      });
    }

    // Check token expiry
    const debugRes = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${token}`
    );
    const debugData = await debugRes.json();
    const expiresAt = debugData.data?.expires_at;
    const isValid = debugData.data?.is_valid;

    return NextResponse.json({
      status: isValid ? "valid" : "expired",
      name: data.name,
      pageId,
      expiresAt: expiresAt ? new Date(expiresAt * 1000).toISOString() : "never",
      expiresIn: expiresAt ? `${Math.round((expiresAt * 1000 - Date.now()) / 86400000)} days` : "never",
    });
  } catch (err: unknown) {
    return NextResponse.json({
      status: "error",
      error: err instanceof Error ? err.message : "Failed to check token",
    });
  }
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { shortLivedToken, appId, appSecret } = await req.json();

    if (!shortLivedToken || !appId || !appSecret) {
      return NextResponse.json({
        error: "Missing required fields",
        required: { shortLivedToken: "From Graph Explorer", appId: "Facebook App ID", appSecret: "Facebook App Secret" },
        instructions: [
          "1. Go to https://developers.facebook.com/tools/explorer/",
          "2. Select your app → Get Page Access Token",
          "3. Grant: pages_manage_posts, pages_read_engagement, pages_show_list, publish_video",
          "4. Copy the token and POST here with your appId and appSecret",
        ],
      }, { status: 400 });
    }

    // Step 1: Exchange short-lived USER token for long-lived USER token
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
    );
    const longLivedData = await longLivedRes.json();

    if (longLivedData.error) {
      return NextResponse.json({ error: "Token exchange failed", details: longLivedData.error.message }, { status: 400 });
    }

    const longLivedUserToken = longLivedData.access_token;

    // Step 2: Get page access token from the long-lived user token
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedUserToken}`
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      return NextResponse.json({ error: "Failed to get pages", details: pagesData.error.message }, { status: 400 });
    }

    // Find the matching page
    const page = pagesData.data?.find((p: { id: string }) => p.id === pageId) || pagesData.data?.[0];

    if (!page) {
      return NextResponse.json({
        error: "No pages found",
        message: "Make sure your Facebook app has pages_manage_posts permission and you've selected your page in Graph Explorer",
      }, { status: 400 });
    }

    const pageToken = page.access_token;

    // Verify the new page token works
    const verifyRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${pageToken}`
    );
    const verifyData = await verifyRes.json();

    return NextResponse.json({
      success: true,
      pageName: verifyData.name || page.name,
      pageId: page.id,
      newToken: pageToken,
      instructions: [
        "✅ Long-lived page token generated successfully!",
        "📋 Copy the 'newToken' value above",
        "🔧 Go to Vercel → Settings → Environment Variables",
        "📝 Update FACEBOOK_PAGE_ACCESS_TOKEN with the new token",
        "🚀 Redeploy for it to take effect",
        `⏰ This token should last ~60 days (until ~${new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0]})`,
      ],
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
