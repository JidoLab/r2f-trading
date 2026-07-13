import { NextRequest, NextResponse } from "next/server";

// TEMPORARY diagnostic — confirms the PayPal server env vars are actually
// present (and non-empty) before the fail-closed verification code goes live.
// Reports only "set/MISSING" and the value LENGTH, never the values themselves.
// Gated by a one-off key. Remove this route once the check has passed.
const CHECK_KEY = "r2f-ppcheck-a7f3k9x2q5";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== CHECK_KEY) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const val = (v?: string) => (v || "").trim();
  const state = (v?: string) => (val(v).length > 0 ? "set" : "MISSING");

  return NextResponse.json({
    PAYPAL_CLIENT_ID: state(process.env.PAYPAL_CLIENT_ID),
    PAYPAL_CLIENT_SECRET: state(process.env.PAYPAL_CLIENT_SECRET),
    NEXT_PUBLIC_PAYPAL_CLIENT_ID: state(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID),
    // lengths (not values) catch the paste-into-Notes empty-value trap
    lengths: {
      PAYPAL_CLIENT_ID: val(process.env.PAYPAL_CLIENT_ID).length,
      PAYPAL_CLIENT_SECRET: val(process.env.PAYPAL_CLIENT_SECRET).length,
      NEXT_PUBLIC_PAYPAL_CLIENT_ID: val(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID).length,
    },
    // do the client IDs match? (server PAYPAL_CLIENT_ID should equal the public one)
    clientIdsMatch:
      val(process.env.PAYPAL_CLIENT_ID) === val(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) &&
      val(process.env.PAYPAL_CLIENT_ID).length > 0,
  });
}
