import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "WEEKLY MARKET RECAP";
  const items = searchParams.get("items") || "";
  const week = searchParams.get("week") || "";

  const bulletItems = items
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);

  const itemFontSize = bulletItems.length > 5 ? 24 : bulletItems.length > 4 ? 26 : 28;

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

        {/* Title */}
        <div
          style={{
            fontSize: 42,
            fontWeight: 900,
            color: "#c9a84c",
            letterSpacing: 3,
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          {title.toUpperCase()}
        </div>

        {/* Week label */}
        {week && (
          <div
            style={{
              fontSize: 18,
              color: "rgba(255, 255, 255, 0.5)",
              textAlign: "center",
              marginTop: 12,
              display: "flex",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {week}
          </div>
        )}

        {/* Gold divider */}
        <div
          style={{
            width: 80,
            height: 3,
            background: "#c9a84c",
            display: "flex",
            alignSelf: "center",
            marginTop: 30,
            marginBottom: 30,
          }}
        />

        {/* Bullet items */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: 24,
            padding: "0 30px",
          }}
        >
          {bulletItems.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 18,
              }}
            >
              {/* Gold bullet */}
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: "#c9a84c",
                  marginTop: 8,
                  flexShrink: 0,
                  display: "flex",
                }}
              />
              <div
                style={{
                  fontSize: itemFontSize,
                  color: "#ffffff",
                  lineHeight: 1.4,
                  display: "flex",
                }}
              >
                {item}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom branding */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            marginTop: 20,
          }}
        >
          {/* Gold divider */}
          <div
            style={{
              width: 80,
              height: 2,
              background: "#c9a84c",
              display: "flex",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "#c9a84c",
                display: "flex",
              }}
            >
              R2F
            </div>
            <div
              style={{
                fontSize: 12,
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
            FOLLOW FOR DAILY ANALYSIS
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
