import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "r2f_admin_session";

export async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  return session?.value === getSessionToken();
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
