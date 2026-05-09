"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  meta?: Record<string, unknown>;
};

function timeAgo(dateStr: string, isAr: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return isAr ? "الآن" : "Just now";
  if (minutes < 60) return isAr ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
  if (hours < 24) return isAr ? `منذ ${hours} ساعة` : `${hours}h ago`;
  return isAr ? `منذ ${days} يوم` : `${days}d ago`;
}

const typeIcon: Record<string, string> = {
  SUBSCRIPTION_APPROVED: "✅",
  SUBSCRIPTION_REJECTED: "❌",
  SUBSCRIPTION_EXTENDED: "🎁",
  SUBSCRIPTION_PAYMENT_REQUESTED: "💳",
};

interface Props {
  locale: string;
}

export function NotificationBell({ locale }: Props) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.isRead).length;

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json().catch(() => []);
      setNotifs(Array.isArray(data) ? data : []);
    } catch {
      // ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + poll every 60s
  useEffect(() => {
    void fetchNotifs();
    const interval = setInterval(() => void fetchNotifs(), 60000);
    function onVisibilityChange() {
      if (document.visibilityState === "visible") void fetchNotifs();
    }
    window.addEventListener("focus", fetchNotifs);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetchNotifs);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchNotifs]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) await fetchNotifs();
  }

  async function markRead(id: string) {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    await fetch(`/api/notifications?id=${id}`, { method: "PATCH" }).catch(
      () => null,
    );
  }

  async function handleNotifClick(n: Notification) {
    await markRead(n.id);

    const link = n.meta?.link as string | undefined;

    if (link) {
      setOpen(false);
      router.push(link.startsWith(`/${locale}/`) ? link : `/${locale}${link}`);
    }
  }

  async function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));

    await fetch("/api/notifications/mark-all-read", {
      method: "PATCH",
    }).catch(() => null);
  }
  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => void handleOpen()}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-surface-2 transition-colors"
        aria-label={isAr ? "الإشعارات" : "Notifications"}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={`absolute top-11 z-[200] w-80 rounded-xl border border-card-border bg-card shadow-xl overflow-hidden ${
            isAr ? "left-0" : "right-0"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-card-border bg-surface">
            <h3 className="text-sm font-semibold text-foreground">
              {isAr ? "الإشعارات" : "Notifications"}
              {unread > 0 && (
                <span className="ms-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-fg">
                  {unread}
                </span>
              )}
            </h3>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs text-primary hover:underline"
              >
                {isAr ? "قراءة الكل" : "Mark all read"}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && notifs.length === 0 && (
              <div className="py-8 text-center text-sm text-muted animate-pulse">
                {isAr ? "جارٍ التحميل..." : "Loading..."}
              </div>
            )}
            {!loading && notifs.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-sm text-muted">
                  {isAr ? "لا توجد إشعارات بعد" : "No notifications yet"}
                </p>
              </div>
            )}
            {notifs.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => void handleNotifClick(n)}
                className={`w-full text-start px-4 py-3 border-b border-card-border last:border-0 hover:bg-surface-2 transition-colors ${
                  !n.isRead ? "bg-primary/4" : ""
                } ${n.meta?.link ? "cursor-pointer" : ""}`}
              >
                <div className="flex gap-3">
                  <span className="shrink-0 text-base leading-none mt-0.5">
                    {typeIcon[n.type] ?? "🔔"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm leading-snug ${
                        !n.isRead
                          ? "font-semibold text-foreground"
                          : "font-medium text-foreground/80"
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[10px] text-muted/70">
                      {timeAgo(n.createdAt, isAr)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
