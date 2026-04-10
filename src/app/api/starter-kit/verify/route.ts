import { NextRequest, NextResponse } from "next/server";
import { readFile } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "No token provided" },
        { status: 400 }
      );
    }

    let purchases: { token: string; email: string; purchaseDate: string }[] =
      [];
    try {
      purchases = JSON.parse(
        await readFile("data/starter-kit-purchases.json")
      );
    } catch {
      return NextResponse.json({ valid: false });
    }

    const purchase = purchases.find((p) => p.token === token);

    if (!purchase) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      email: purchase.email,
      purchaseDate: purchase.purchaseDate,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { valid: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
