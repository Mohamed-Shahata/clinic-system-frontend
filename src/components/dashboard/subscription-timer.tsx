"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

type Subscription = {
  plan: { name: string; durationDays: number };
  startsAt: string;
  expiresAt: string;
  status: string;
};

function calcState(expiresAt: string, durationDays: number) {
  const now = Date.now();
  const end = new Date(expiresAt).getTime();
  const totalMs = durationDays * 24 * 60 * 60 * 1000;
  const remainingMs = Math.max(0, end - now);
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  const progress = Math.max(0, Math.min(1, remainingMs / totalMs));
  const pct = progress * 100;

  let status: "green" | "yellow" | "red";
  if (pct > 50) status = "green";
  else if (pct > 20) status = "yellow";
  else status = "red";

  return { remainingDays, remainingMs, progress: pct, status };
}

export function SubscriptionTimer() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [sub, setSub] = useState<Subscription | null | "loading">("loading");
  const [tick, setTick] = useState(0);

  const fetchSub = () => {
    fetch("/api/billing/subscription", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          setSub(null);
          return;
        }
        const data = await res.json().catch(() => null);
        setSub(data ?? null);
      })
      .catch(() => setSub(null));
  };

  useEffect(() => {
    fetchSub();
    // Re-fetch whenever the user navigates back to this tab/page
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchSub();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", fetchSub);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", fetchSub);
    };
  }, []);

  // update every minute
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (sub === "loading") {
    return (
      <div className="rounded-xl border border-card-border bg-card p-5 animate-pulse">
        <div className="h-4 w-32 rounded bg-surface-2 mb-3" />
        <div className="h-3 w-full rounded bg-surface-2" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="rounded-xl border border-card-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground mb-0.5">
          {isAr ? "الاشتراك" : "Subscription"}
        </p>
        <p className="text-xs text-muted">
          {isAr ? "لا يوجد اشتراك نشط" : "No active subscription"}
        </p>
      </div>
    );
  }

  const { remainingDays, progress, status } = calcState(
    sub.expiresAt,
    sub.plan.durationDays,
  );

  const colorConfig = {
    green: {
      track: "bg-success/15",
      bar: "bg-success",
      glow: "shadow-[0_0_10px_hsl(var(--success)/0.35)]",
      text: "text-success",
      badge: "bg-success/10 text-success border-success/20",
      label: isAr ? "نشط" : "Active",
    },
    yellow: {
      track: "bg-warning/15",
      bar: "bg-warning",
      glow: "shadow-[0_0_10px_hsl(var(--warning)/0.35)]",
      text: "text-warning",
      badge: "bg-warning/10 text-warning border-warning/20",
      label: isAr ? "يقترب الانتهاء" : "Expiring soon",
    },
    red: {
      track: "bg-danger/15",
      bar: "bg-danger",
      glow: "shadow-[0_0_10px_hsl(var(--danger)/0.40)]",
      text: "text-danger",
      badge: "bg-danger/10 text-danger border-danger/20",
      label: isAr ? "على وشك الانتهاء" : "Expiring very soon",
    },
  }[status];

  const expiryDate = new Date(sub.expiresAt).toLocaleDateString(
    isAr ? "ar-EG" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div className="rounded-xl border border-card-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isAr ? "الاشتراك الحالي" : "Current Subscription"}
          </p>
          <p className="text-xs text-muted mt-0.5">{sub.plan.name}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorConfig.badge}`}
        >
          {colorConfig.label}
        </span>
      </div>

      {/* Days counter */}
      <div className="flex items-end gap-2">
        <span
          className={`text-4xl font-bold tabular-nums leading-none ${colorConfig.text}`}
        >
          {remainingDays}
        </span>
        <span className="text-sm text-muted mb-0.5">
          {isAr ? "يوم متبقي" : remainingDays === 1 ? "day left" : "days left"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div
          className={`h-2.5 w-full rounded-full overflow-hidden ${colorConfig.track}`}
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${colorConfig.bar} ${colorConfig.glow}`}
            style={{ width: `${Math.max(2, progress)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>
            {isAr ? "متبقي" : "Remaining"}{" "}
            <span className={`font-medium ${colorConfig.text}`}>
              {Math.round(progress)}%
            </span>
          </span>
          <span>{isAr ? `ينتهي ${expiryDate}` : `Expires ${expiryDate}`}</span>
        </div>
      </div>

      {/* Dots timeline */}
      <div className="flex items-center gap-1 pt-1" aria-hidden>
        {Array.from({
          length: sub.plan.durationDays > 60 ? 30 : sub.plan.durationDays,
        }).map((_, i) => {
          const total = sub.plan.durationDays > 60 ? 30 : sub.plan.durationDays;
          const filled = (progress / 100) * total;
          const active = i < Math.round(filled);
          return (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                active ? colorConfig.bar : "bg-border"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
