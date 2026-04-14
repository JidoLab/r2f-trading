"use client";

import { useEffect, useRef, useState } from "react";
import { trackFBEvent } from "@/lib/tracking";

interface PayPalButtonProps {
  planName: string;
  amount: string;
  description: string;
  onSuccess?: (details: Record<string, unknown>) => void;
  highlight?: boolean;
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => { render: (el: HTMLElement) => void };
    };
  }
}

// Client ID is inlined at build time — must be set BEFORE deploying
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

export default function PayPalButton({ planName, amount, description, onSuccess, highlight = false }: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [showPaypal, setShowPaypal] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const rendered = useRef(false);

  // Load PayPal SDK only when user clicks "Pay with PayPal"
  useEffect(() => {
    if (!showPaypal) return;
    if (window.paypal) {
      setSdkReady(true);
      return;
    }

    // Fetch client ID from API if not inlined at build time
    async function loadSdk() {
      let clientId = PAYPAL_CLIENT_ID;

      // If not inlined, fetch from server
      if (!clientId) {
        try {
          const res = await fetch("/api/paypal-config");
          if (res.ok) {
            const data = await res.json();
            clientId = data.clientId || "";
          }
        } catch {}
      }

      if (!clientId) {
        setSdkError(true);
        return;
      }

      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
      script.async = true;
      script.onload = () => setSdkReady(true);
      script.onerror = () => setSdkError(true);
      document.body.appendChild(script);
    }

    loadSdk();
  }, [showPaypal]);

  // Render PayPal buttons once SDK is ready
  useEffect(() => {
    if (!sdkReady || !showPaypal || !containerRef.current || rendered.current) return;
    if (!window.paypal) return;

    rendered.current = true;

    window.paypal.Buttons({
      style: {
        layout: "vertical",
        color: "gold",
        shape: "rect",
        label: "pay",
        height: 45,
      },
      createOrder: (_data: unknown, actions: { order: { create: (opts: Record<string, unknown>) => Promise<string> } }) => {
        return actions.order.create({
          purchase_units: [{
            description: `R2F Trading — ${planName}`,
            amount: {
              currency_code: "USD",
              value: amount,
            },
          }],
          application_context: {
            brand_name: "R2F Trading",
            shipping_preference: "NO_SHIPPING",
          },
        });
      },
      onApprove: async (_data: unknown, actions: { order: { capture: () => Promise<Record<string, unknown>> } }) => {
        const details = await actions.order.capture();
        setCompleted(true);
        setShowPaypal(false);
        trackFBEvent("Purchase", { value: parseFloat(amount), currency: "USD" });

        // Notify backend
        try {
          await fetch("/api/payment-success", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan: planName,
              amount,
              payerEmail: (details.payer as Record<string, unknown>)?.email_address || "",
              payerName: ((details.payer as Record<string, unknown>)?.name as Record<string, unknown>)?.given_name || "",
              orderId: details.id,
              status: details.status,
            }),
          });
        } catch {}

        onSuccess?.(details);
      },
      onCancel: () => {
        // User closed PayPal popup
      },
      onError: (err: unknown) => {
        console.error("PayPal error:", err);
        alert("Payment failed. Please try again or contact us directly.");
      },
    }).render(containerRef.current!);
  }, [sdkReady, showPaypal, planName, amount, onSuccess]);

  if (completed) {
    return (
      <div className="text-center py-3">
        <div className="text-green-500 font-bold text-lg mb-1">✓ Payment Received!</div>
        <p className="text-sm text-gray-500">Check your email for confirmation. We&apos;ll be in touch within 24 hours.</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {!showPaypal ? (
        <button
          onClick={() => setShowPaypal(true)}
          className={`w-full text-center font-bold text-sm tracking-wide px-6 py-3 rounded-md transition-all uppercase ${
            highlight
              ? "bg-white/20 hover:bg-white/30 text-white border border-white/30"
              : "bg-gray-200 hover:bg-gray-300 text-navy"
          }`}
        >
          Pay with PayPal
        </button>
      ) : sdkError ? (
        <div className="text-center py-2">
          <p className={`text-xs ${highlight ? "text-white/60" : "text-gray-500"}`}>
            PayPal unavailable. <a href="/contact" className="underline">Contact us</a> to arrange payment.
          </p>
        </div>
      ) : !sdkReady ? (
        <div className="text-center py-3">
          <div className={`text-sm ${highlight ? "text-white/60" : "text-gray-500"}`}>Loading PayPal...</div>
        </div>
      ) : (
        <div>
          <div className="text-center mb-2">
            <span className={`text-xs ${highlight ? "text-white/60" : "text-gray-500"}`}>
              {description} — ${amount} USD
            </span>
          </div>
          <div ref={containerRef} />
          <button
            onClick={() => { setShowPaypal(false); rendered.current = false; }}
            className={`mt-2 w-full text-center text-xs py-1 ${highlight ? "text-white/50 hover:text-white/70" : "text-gray-400 hover:text-gray-600"}`}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
