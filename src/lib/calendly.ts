// Calendly v2 API helpers: webhook signature verification + one-time webhook
// registration. Requires a Calendly paid plan (Standard+) for webhooks.
//
// Env:
//   CALENDLY_API_TOKEN          — personal access token (Calendly > Integrations
//                                 > API & webhooks). Used to register the webhook
//                                 and look up your user/org URIs.
//   CALENDLY_WEBHOOK_SIGNING_KEY — returned when the webhook is created; used by
//                                 the receiver to verify incoming events.

import crypto from "crypto";

const CALENDLY_API = "https://api.calendly.com";

export function isCalendlyConfigured(): boolean {
  return !!process.env.CALENDLY_API_TOKEN;
}

export async function getCalendlyUser(): Promise<
  { uri: string; org: string; name?: string; email?: string } | null
> {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${CALENDLY_API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const d = await res.json();
    return {
      uri: d.resource.uri,
      org: d.resource.current_organization,
      name: d.resource.name,
      email: d.resource.email,
    };
  } catch {
    return null;
  }
}

/**
 * Create the webhook subscription (idempotent-ish: Calendly 409s if an identical
 * one exists). Returns the signing key, which must then be set as
 * CALENDLY_WEBHOOK_SIGNING_KEY in the environment.
 */
export async function registerCalendlyWebhook(
  callbackUrl: string
): Promise<{ ok: boolean; signingKey?: string; uri?: string; error?: string }> {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return { ok: false, error: "CALENDLY_API_TOKEN is not set" };
  const me = await getCalendlyUser();
  if (!me) return { ok: false, error: "Could not fetch Calendly user — check the API token" };

  try {
    const res = await fetch(`${CALENDLY_API}/webhook_subscriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: callbackUrl,
        events: ["invitee.created", "invitee.canceled"],
        organization: me.org,
        user: me.uri,
        scope: "user",
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true, signingKey: d.resource?.signing_key, uri: d.resource?.uri };
    }
    return { ok: false, error: (d?.message || JSON.stringify(d)).slice(0, 300) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "register failed" };
  }
}

/**
 * Verify a Calendly webhook signature.
 * Header format: "t=<unix>,v1=<hex hmac>"; HMAC-SHA256 of `${t}.${rawBody}`.
 */
export function verifyCalendlySignature(
  rawBody: string,
  header: string | null,
  signingKey: string
): boolean {
  if (!header || !signingKey) return false;
  try {
    const parts: Record<string, string> = {};
    for (const kv of header.split(",")) {
      const [k, v] = kv.split("=");
      if (k && v) parts[k.trim()] = v.trim();
    }
    const t = parts["t"];
    const v1 = parts["v1"];
    if (!t || !v1) return false;
    const expected = crypto
      .createHmac("sha256", signingKey)
      .update(`${t}.${rawBody}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(v1);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
