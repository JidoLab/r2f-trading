const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getRedditAccessToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const refreshToken = process.env.REDDIT_REFRESH_TOKEN;

  if (!clientId || !refreshToken) return null;

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret || ""}`).toString("base64");
  const username = process.env.REDDIT_USERNAME || "R2FTrading";

  const res = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": `R2FTrading/1.0 by ${username}`,
    },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
  });

  if (!res.ok) {
    console.error(`[reddit-auth] Token refresh failed: ${res.status}`);
    return null;
  }

  const data = await res.json();
  if (!data.access_token) return null;

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return cachedToken.token;
}

export function getRedditUserAgent(): string {
  const username = process.env.REDDIT_USERNAME || "R2FTrading";
  return `R2FTrading/1.0 by ${username}`;
}
