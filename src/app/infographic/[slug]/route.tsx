import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "Trading Insights";
  const pointsRaw = searchParams.get("points") || "";
  const points = pointsRaw
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  // Also support stat1, stat2, stat3 params
  for (let i = 1; i <= 5; i++) {
    const stat = searchParams.get(`stat${i}`);
    if (stat && !points.includes(stat)) points.push(stat);
  }

  // Clamp to 3-5 items
  const displayPoints = points.slice(0, 5);
  const titleSize = title.length > 40 ? 36 : title.length > 25 ? 42 : 48;

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
          padding: "0",
          position: "relative",
        }}
      >
        {/* Gold accent bar top */}
        <div
          style={{
            height: 8,
            background: "linear-gradient(90deg, #c9a84c, #e8d48b, #c9a84c)",
            display: "flex",
            width: "100%",
          }}
        />

        {/* Main content area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "48px 56px 32px",
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.2,
              marginBottom: 36,
              display: "flex",
              maxWidth: "95%",
            }}
          >
            {title}
          </div>

          {/* Thin gold divider */}
          <div
            style={{
              width: 60,
              height: 3,
              background: "#c9a84c",
              marginBottom: 32,
              display: "flex",
            }}
          />

          {/* Numbered points */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: displayPoints.length > 4 ? 16 : 22,
              flex: 1,
            }}
          >
            {displayPoints.map((point, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 20,
                }}
              >
                {/* Gold number circle */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    background: "#c9a84c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#0d2137",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                {/* Point text */}
                <div
                  style={{
                    fontSize: point.length > 80 ? 20 : 24,
                    color: "rgba(255,255,255,0.9)",
                    lineHeight: 1.4,
                    display: "flex",
                    alignItems: "center",
                    paddingTop: 6,
                  }}
                >
                  {point}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom branding bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 56px",
            borderTop: "1px solid rgba(201,168,76,0.3)",
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
                color: "rgba(255,255,255,0.4)",
                letterSpacing: 4,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              Trading
            </div>
          </div>
          <div
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.35)",
              display: "flex",
            }}
          >
            r2ftrading.com
          </div>
        </div>

        {/* Gold accent bar bottom */}
        <div
          style={{
            height: 8,
            background: "linear-gradient(90deg, #c9a84c, #e8d48b, #c9a84c)",
            display: "flex",
            width: "100%",
          }}
        />
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
