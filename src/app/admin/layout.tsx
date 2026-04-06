import { requireAdmin } from "@/lib/admin-auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[#0a1628] flex">
      {/* Sidebar */}
      <aside className="w-56 bg-navy border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-1">
            <span className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>
              R<span className="text-gold">2</span>F
            </span>
            <span className="text-[8px] font-bold tracking-[0.25em] uppercase text-white/50 ml-1 mt-1">
              Admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/admin"
            className="block px-4 py-2.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/posts"
            className="block px-4 py-2.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Blog Posts
          </Link>
          <Link
            href="/admin/subscribers"
            className="block px-4 py-2.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Subscribers
          </Link>
          <Link
            href="/admin/shorts"
            className="block px-4 py-2.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Shorts Automation
          </Link>
          <Link
            href="/admin/calendar"
            className="block px-4 py-2.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Content Calendar
          </Link>
          <Link
            href="/admin/chat-logs"
            className="block px-4 py-2.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Chat Logs
          </Link>
          <Link
            href="/admin/trends"
            className="block px-4 py-2.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Market Trends
          </Link>
          <Link
            href="/admin/signature"
            className="block px-4 py-2.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Email Signature
          </Link>
          <a
            href="https://vercel.com/wrightharvest-9811s-projects/r2f-trading/analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Analytics ↗
          </a>
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            href="/"
            className="block px-4 py-2 rounded-md text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            ← View Site
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        cookieStore.delete("r2f_admin_session");
        const { redirect } = await import("next/navigation");
        redirect("/admin-login");
      }}
    >
      <button
        type="submit"
        className="block w-full text-left px-4 py-2 rounded-md text-xs text-red-400/60 hover:text-red-400 transition-colors"
      >
        Sign Out
      </button>
    </form>
  );
}
