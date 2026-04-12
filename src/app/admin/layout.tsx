import { requireAdmin } from "@/lib/admin-auth";
import Link from "next/link";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/briefing", label: "AI Briefing" },
      { href: "/admin/notifications", label: "Notifications" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/posts", label: "Blog Posts" },
      { href: "/admin/shorts", label: "Shorts" },
      { href: "/admin/newsletters", label: "Newsletters" },
      { href: "/admin/content-planner", label: "AI Planner" },
      { href: "/admin/calendar", label: "Content Calendar" },
      { href: "/admin/social-calendar", label: "Social Calendar" },
      { href: "/admin/landing-pages", label: "Landing Pages" },
      { href: "/admin/image-library", label: "Image Library" },
    ],
  },
  {
    label: "Engagement",
    items: [
      { href: "/admin/engagement-log", label: "Engagement Log" },
      { href: "/admin/reply-suggestions", label: "Reply Suggestions" },
      { href: "/admin/chat-logs", label: "Chat Logs" },
      { href: "/admin/reviews", label: "Reviews" },
      { href: "/admin/share", label: "Quick Share" },
      { href: "/admin/whatsapp", label: "WhatsApp" },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/admin/subscribers", label: "Subscribers" },
      { href: "/admin/pipeline", label: "Lead Pipeline" },
      { href: "/admin/audience", label: "Audience Insights" },
    ],
  },
  {
    label: "Revenue",
    items: [
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/revenue", label: "Revenue Tracker" },
      { href: "/admin/ab-tests", label: "A/B Tests" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/admin/performance", label: "Performance" },
      { href: "/admin/competitors", label: "Competitor Spy" },
      { href: "/admin/trends", label: "Market Trends" },
      { href: "/admin/analytics-dashboard", label: "Analytics Dashboard" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/admin/signature", label: "Branding Kit" },
      { href: "/admin/gbp", label: "Google Business" },
    ],
    external: [
      { href: "https://vercel.com/wrightharvest-9811s-projects/r2f-trading/analytics", label: "Analytics ↗" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[#0a1628] md:flex">
      {/* Mobile header */}
      <div className="md:hidden bg-navy border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <Link href="/admin" className="flex items-center gap-1">
          <span className="text-xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>
            R<span className="text-gold">2</span>F
          </span>
          <span className="text-[7px] font-bold tracking-[0.2em] uppercase text-white/50 ml-1 mt-0.5">
            Admin
          </span>
        </Link>
        <label htmlFor="mobile-nav" className="text-white/70 hover:text-white cursor-pointer p-1">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </label>
      </div>

      {/* Mobile nav checkbox hack (no JS needed) */}
      <input type="checkbox" id="mobile-nav" className="hidden peer" />

      {/* Sidebar */}
      <aside className="hidden peer-checked:block md:block w-full md:w-56 bg-navy border-r border-white/10 md:flex md:flex-col md:sticky md:top-0 md:h-screen overflow-y-auto z-40">
        {/* Desktop logo */}
        <div className="hidden md:block p-6 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-1">
            <span className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-heading)" }}>
              R<span className="text-gold">2</span>F
            </span>
            <span className="text-[8px] font-bold tracking-[0.25em] uppercase text-white/50 ml-1 mt-1">
              Admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              <div className="px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase text-white/30">
                {section.label}
              </div>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              {section.external?.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 rounded-md text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <Link
            href="/"
            className="block px-3 py-2 rounded-md text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            ← View Site
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* Backdrop for mobile */}
      <label htmlFor="mobile-nav" className="hidden peer-checked:block md:hidden fixed inset-0 bg-black/50 z-30" />

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
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
        className="block w-full text-left px-3 py-2 rounded-md text-xs text-red-400/60 hover:text-red-400 transition-colors"
      >
        Sign Out
      </button>
    </form>
  );
}
