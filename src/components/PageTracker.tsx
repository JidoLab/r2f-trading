"use client";

import { useEffect } from "react";
import { trackEngagement } from "@/lib/tracking";

export default function PageTracker({ event, data }: { event: string; data?: Record<string, string> }) {
  useEffect(() => {
    trackEngagement(event, data);
  }, [event, data]);

  return null;
}
