import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0d2137 0%, #1a3a5c 50%, #0d2137 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Gold accent line at top */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "#c9a84c", display: "flex" }} />

        {/* R2F text logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 120, fontWeight: 900, color: "#c9a84c", letterSpacing: "-2px", display: "flex" }}>
            R2F
          </div>
          <div style={{ fontSize: 42, fontWeight: 700, color: "#ffffff", letterSpacing: "8px", textTransform: "uppercase", display: "flex" }}>
            TRADING
          </div>
          <div style={{ width: 120, height: 3, background: "#c9a84c", marginTop: 8, display: "flex" }} />
          <div style={{ fontSize: 24, color: "#b0b8c4", marginTop: 12, display: "flex" }}>
            Professional ICT Coaching & Mentorship
          </div>
        </div>

        {/* Gold accent line at bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: "#c9a84c", display: "flex" }} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
