import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tip = searchParams.get("tip") || "Always protect your capital first.";
  const category = searchParams.get("category") || "ICT Concepts";
  const number = searchParams.get("number") || "1";

  const displayTip = tip.length > 220 ? tip.slice(0, 217) + "..." : tip;
  const fontSize = displayTip.length > 150 ? 32 : displayTip.length > 100 ? 36 : 40;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0d2137",
          fontFamily: "system-ui, sans-serif",
          padding: "60px 70px",
          position: "relative",
        }}
      >
        {/* Gold accent bar top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "#c9a84c",
            display: "flex",
          }}
        />

        {/* Top row: category badge + tip number */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            width: "100%",
          }}
        >
          {/* Category badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(201, 168, 76, 0.15)",
              border: "1px solid rgba(201, 168, 76, 0.4)",
              borderRadius: 6,
              padding: "8px 18px",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: "#c9a84c",
                letterSpacing: 3,
                textTransform: "uppercase",
                fontWeight: 700,
                display: "flex",
              }}
            >
              {category.toUpperCase()}
            </div>
          </div>

          {/* Tip number */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: "rgba(255, 255, 255, 0.08)",
              lineHeight: 1,
              display: "flex",
            }}
          >
            #{number}
          </div>
        </div>

        {/* Main tip text — centered in remaining space */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              fontSize,
              color: "#ffffff",
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.5,
              maxWidth: "95%",
              display: "flex",
            }}
          >
            {displayTip}
          </div>
        </div>

        {/* Gold divider line */}
        <div
          style={{
            width: 100,
            height: 3,
            background: "#c9a84c",
            display: "flex",
            alignSelf: "center",
            marginBottom: 40,
          }}
        />

        {/* R2F Trading branding */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: "#c9a84c",
                display: "flex",
              }}
            >
              R2F
            </div>
            <div
              style={{
                fontSize: 14,
                color: "rgba(255, 255, 255, 0.4)",
                letterSpacing: 5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              Trading
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.2)",
              letterSpacing: 2,
              display: "flex",
            }}
          >
            SAVE &amp; SHARE
          </div>
        </div>

        {/* Gold accent bar bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "#c9a84c",
            display: "flex",
          }}
        />
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
