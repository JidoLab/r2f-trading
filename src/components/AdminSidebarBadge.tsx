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

export function DailyTasksBadge() {
  const [info, setInfo] = useState<{ completed: number; total: number } | null>(null);

  useEffect(() => {
    const fetchCount = () => {
      fetch("/api/admin/daily-tasks?countOnly=true")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setInfo(d))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!info || info.total <= 0) return null;

  const allDone = info.completed === info.total;

  return (
    <span className={`ml-auto text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 ${
      allDone ? "bg-green-500/20 text-green-400" : "bg-gold/20 text-gold"
    }`}>
      {info.completed}/{info.total}
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
