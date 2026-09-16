import type { Metadata } from "next";
import LiveOverlay from "@/components/LiveOverlay";

/**
 * Transparent scoreboard page for XSplit (Add Source > Webpage). Not linked
 * anywhere and excluded from indexing. The global floating widgets are
 * suppressed for this path in ClientWidgets.
 */
export const metadata: Metadata = {
  title: { absolute: "R2F stream overlay" },
  robots: { index: false, follow: false },
};

export default function OverlayPage() {
  return (
    <>
      <style>{`html, body { background: transparent !important; margin: 0; overflow: hidden; }`}</style>
      <LiveOverlay />
    </>
  );
}
