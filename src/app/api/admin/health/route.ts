import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const warnings: string[] = [];
  const errors: string[] = [];

  // Check GitHub token
  if (!process.env.GITHUB_TOKEN) {
    errors.push("GITHUB_TOKEN not set");
  }

  // Check Anthropic key
  if (!process.env.ANTHROPIC_API_KEY) {
    warnings.push("ANTHROPIC_API_KEY not set");
  }

  // Check Resend key
  if (!process.env.RESEND_API_KEY) {
    warnings.push("RESEND_API_KEY not set");
  }

  // Check cron secret
  if (!process.env.CRON_SECRET) {
    warnings.push("CRON_SECRET not set");
  }

  const status = errors.length > 0 ? "red" : warnings.length > 0 ? "yellow" : "green";

  return NextResponse.json({ status, warnings, errors });
}
