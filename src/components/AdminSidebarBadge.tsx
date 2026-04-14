"use client";

import { useEffect, useState } from "react";

export function NotificationBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = () => {
      fetch("/api/admin/notifications?count=true")
        .then((r) => (r.ok ? r.json() : { unreadCount: 0 }))
        .then((d) => setCount(d.unreadCount || 0))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  if (count <= 0) return null;

  return (
    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function ReplySuggestionsBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = () => {
      fetch("/api/admin/reply-suggestions?countPending=true")
        .then((r) => (r.ok ? r.json() : { pendingCount: 0 }))
        .then((d) => setCount(d.pendingCount || 0))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  if (count <= 0) return null;

  return (
    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}
