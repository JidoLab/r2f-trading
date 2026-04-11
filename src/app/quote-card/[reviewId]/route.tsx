import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "Trader";
  const quote = searchParams.get("quote") || "";
  const rating = parseInt(searchParams.get("rating") || "5");

  const displayQuote = quote.length > 200 ? quote.slice(0, 197) + "..." : quote;
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

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
          background: "#0d2137",
          fontFamily: "system-ui, sans-serif",
          padding: "80px",
          position: "relative",
        }}
      >
        {/* Gold accent line top */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "#c9a84c", display: "flex" }} />

        {/* Decorative quote mark */}
        <div style={{ fontSize: 120, color: "#c9a84c", opacity: 0.3, position: "absolute", top: 40, left: 60, display: "flex" }}>
          &ldquo;
        </div>

        {/* Quote text */}
        <div
          style={{
            fontSize: displayQuote.length > 150 ? 28 : displayQuote.length > 100 ? 32 : 36,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.5,
            maxWidth: "90%",
            display: "flex",
          }}
        >
          &ldquo;{displayQuote}&rdquo;
        </div>

        {/* Stars */}
        <div style={{ fontSize: 32, color: "#c9a84c", marginTop: 32, letterSpacing: 4, display: "flex" }}>
          {stars}
        </div>

        {/* Name */}
        <div style={{ fontSize: 20, color: "rgba(255,255,255,0.5)", marginTop: 16, display: "flex" }}>
          {name}
        </div>

        {/* Divider */}
        <div style={{ width: 80, height: 2, background: "#c9a84c", marginTop: 32, display: "flex" }} />

        {/* R2F Branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#c9a84c", display: "flex" }}>R2F</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 4, textTransform: "uppercase", display: "flex" }}>Trading</div>
        </div>

        {/* Gold accent line bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: "#c9a84c", display: "flex" }} />
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
