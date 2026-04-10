"use client";

import { useRouter } from "next/navigation";
import PayPalButton from "@/components/PayPalButton";

export default function StarterKitCTA() {
  const router = useRouter();

  return (
    <PayPalButton
      planName="ICT Trading Starter Kit"
      amount="49.00"
      description="ICT Trading Starter Kit — Lifetime Access"
      highlight={true}
      onSuccess={async (details) => {
        // Call the starter-kit purchase API to get an access token
        try {
          const res = await fetch("/api/starter-kit/purchase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payerEmail:
                (details.payer as Record<string, unknown>)?.email_address || "",
              payerName:
                (
                  (details.payer as Record<string, unknown>)
                    ?.name as Record<string, unknown>
                )?.given_name || "",
              orderId: details.id,
              status: details.status,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              localStorage.setItem("starterKitToken", data.token);
              router.push("/starter-kit/access");
            }
          }
        } catch {
          // Still redirect even if API fails — they can verify later
          router.push("/starter-kit/access");
        }
      }}
    />
  );
}
