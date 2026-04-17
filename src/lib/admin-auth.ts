import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "r2f_admin_session";

export async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  return session?.value === getSessionToken();
}

/**
 * Accept EITHER admin session cookie OR Bearer CRON_SECRET.
 * Used on endpoints that need to be triggerable from both:
 *   - the admin dashboard (session cookie)
 *   - server-to-server automation / dev tooling (CRON_SECRET via curl)
 *
 * IMPORTANT: only opt endpoints into this where Bearer-auth is acceptable.
 * Do NOT use on anything that reveals PII or user-specific session data.
 */
export async function verifyAdminOrCron(req: NextRequest): Promise<boolean> {
  // Cookie path first (admin dashboard usage)
  const cookieOk = await verifyAdmin();
  if (cookieOk) return true;

  // Bearer CRON_SECRET path (server-to-server automation)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

export async function requireAdmin() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    redirect("/admin-login");
  }
}

export function getSessionToken(): string {
  // Simple hash of the password to use as session token
  const password = process.env.ADMIN_PASSWORD || "admin";
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `r2f_${Math.abs(hash).toString(36)}`;
}
