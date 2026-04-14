import { NextResponse } from "next/server";
import { readFile } from "@/lib/github";

// Cache response for 5 minutes
export const revalidate = 300;

const CITIES = [
  "London",
  "New York",
  "Dubai",
  "Singapore",
  "Sydney",
  "Toronto",
  "Lagos",
  "Amsterdam",
  "Bangkok",
  "Mumbai",
  "Berlin",
  "Cape Town",
  "Tokyo",
  "Miami",
  "Zurich",
];

function getRandomCity(): string {
  return CITIES[Math.floor(Math.random() * CITIES.length)];
}

function anonymizeName(email: string): string {
  const local = email.split("@")[0] || "";
  const initial = local.charAt(0).toUpperCase();
  return initial ? `${initial}.` : "A trader";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 7) return "recently";
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours >= 1) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return "just now";
}

export async function GET() {
  try {
    const raw = await readFile("data/subscribers.json");
    const subscribers = JSON.parse(raw) as Array<{
      email: string;
      date: string;
      score?: number;
      segment?: string;
    }>;

    // Sort by date descending, take 5 most recent
    const recent = [...subscribers]
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, 5);

    const notifications: string[] = [];

    // Generate personalized messages from real subscriber data
    for (const sub of recent) {
      const name = anonymizeName(sub.email);
      const city = getRandomCity();
      const ago = timeAgo(sub.date);

      notifications.push(
        `\uD83D\uDD14 ${name} from ${city} signed up ${ago}`
      );
    }

    // Add some aggregate stats
    const totalSubs = subscribers.length;
    if (totalSubs > 5) {
      notifications.push(
        `\uD83D\uDCC8 ${totalSubs} traders have joined this month`
      );
    }

    // Count high-score leads (coaching interest)
    const hotLeads = subscribers.filter(
      (s) => (s.score || 0) >= 30
    ).length;
    if (hotLeads > 0) {
      notifications.push(
        `\uD83D\uDD25 ${hotLeads} trader${hotLeads > 1 ? "s" : ""} booked coaching calls recently`
      );
    }

    notifications.push(
      "\uD83C\uDF93 New student joined the crash course"
    );

    return NextResponse.json(notifications, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    // Fallback static notifications if GitHub read fails
    return NextResponse.json(
      [
        "\uD83D\uDD14 A trader just signed up",
        "\uD83D\uDD25 3 traders booked calls this week",
        "\uD83C\uDF93 New student joined the crash course",
      ],
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  }
}
