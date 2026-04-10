import { NextRequest, NextResponse } from "next/server";
import { readFile } from "@/lib/github";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");

    if (!code || !code.startsWith("R2F-")) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    }

    let subscribers: { email: string; referralCode?: string; referralCount?: number }[] = [];
    try {
      const raw = await readFile("data/subscribers.json");
      subscribers = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Referral code not found" }, { status: 404 });
    }

    const referrer = subscribers.find((s) => s.referralCode === code);
    if (!referrer) {
      return NextResponse.json({ error: "Referral code not found" }, { status: 404 });
    }

    // Return only safe info — name/initials, never email
    const localPart = referrer.email.split("@")[0];
    const displayName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
    const initials = displayName
      .split(/[._-]/)
      .map((p) => p.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);

    return NextResponse.json({
      valid: true,
      name: displayName,
      initials,
    });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
