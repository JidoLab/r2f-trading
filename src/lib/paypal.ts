// Server-side PayPal order verification.
//
// Why this exists: the checkout flow captures the PayPal order in the browser
// (actions.order.capture()) and then POSTs the result to our API. Before this
// helper, the API trusted that POST body completely, so anyone could fabricate
// an orderId/amount and be recorded as a paying customer (and, for the starter
// kit, be issued a working access token). This verifies the order against
// PayPal's own API before we trust any of it.
//
// REQUIRES env var PAYPAL_CLIENT_SECRET (plus the existing PAYPAL_CLIENT_ID).
// It is FAIL-CLOSED: if the secret is not configured, verification fails and the
// caller must reject the request. Set PAYPAL_CLIENT_SECRET in Vercel before
// deploying this to production, or live purchases will be rejected.

const PAYPAL_API = process.env.PAYPAL_API_BASE || "https://api-m.paypal.com";

export interface PayPalVerification {
  ok: boolean;
  reason?: string;
  status?: string;
  amount?: string;
  currency?: string;
  payerEmail?: string;
  payerName?: string;
}

export function isPayPalVerificationConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function getAccessToken(): Promise<string | null> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) return null;
  try {
    const auth = Buffer.from(`${id}:${secret}`).toString("base64");
    const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Verify a PayPal order is genuinely COMPLETED and return the trusted values
 * straight from PayPal (never trust the client's amount/email). Optionally
 * enforce an expected amount/currency (e.g. the fixed $49 starter kit).
 */
export async function verifyPayPalOrder(
  orderId: string,
  opts?: { expectedAmount?: string; expectedCurrency?: string }
): Promise<PayPalVerification> {
  if (!orderId || typeof orderId !== "string") {
    return { ok: false, reason: "missing-order-id" };
  }
  if (!isPayPalVerificationConfigured()) {
    return { ok: false, reason: "paypal-not-configured" };
  }
  const token = await getAccessToken();
  if (!token) return { ok: false, reason: "paypal-auth-failed" };

  let order: Record<string, unknown>;
  try {
    const res = await fetch(
      `${PAYPAL_API}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    if (!res.ok) return { ok: false, reason: `order-fetch-${res.status}` };
    order = await res.json();
  } catch {
    return { ok: false, reason: "order-fetch-error" };
  }

  const status = order.status as string | undefined;
  if (status !== "COMPLETED") {
    return { ok: false, reason: `order-status-${status || "unknown"}`, status };
  }

  const units = (order.purchase_units as Record<string, unknown>[]) || [];
  const unit = (units[0] || {}) as Record<string, unknown>;
  const amountObj = (unit.amount as Record<string, unknown>) || {};
  const amount = amountObj.value as string | undefined;
  const currency = amountObj.currency_code as string | undefined;
  const payer = (order.payer as Record<string, unknown>) || {};
  const payerName = payer.name as { given_name?: string; surname?: string } | undefined;

  if (opts?.expectedCurrency && currency !== opts.expectedCurrency) {
    return { ok: false, reason: `currency-mismatch-${currency}`, status, amount, currency };
  }
  if (
    opts?.expectedAmount &&
    parseFloat(amount || "0") !== parseFloat(opts.expectedAmount)
  ) {
    return { ok: false, reason: `amount-mismatch-${amount}`, status, amount, currency };
  }

  return {
    ok: true,
    status,
    amount,
    currency,
    payerEmail: (payer.email_address as string) || undefined,
    payerName: [payerName?.given_name, payerName?.surname].filter(Boolean).join(" ") || undefined,
  };
}
