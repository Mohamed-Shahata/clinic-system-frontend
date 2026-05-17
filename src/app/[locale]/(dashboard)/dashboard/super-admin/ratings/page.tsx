"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

type RatingStats = {
  count: number;
  overall: number;
  ease: number;
  features: number;
  support: number;
  referRate: number;
};

const CRITERIA = [
  { key: "overall",  ar: "التقييم العام",     en: "Overall",     icon: "⭐" },
  { key: "ease",     ar: "سهولة الاستخدام",   en: "Ease of Use", icon: "🖱️" },
  { key: "features", ar: "الميزات والأدوات",  en: "Features",    icon: "🔧" },
  { key: "support",  ar: "الدعم والتواصل",    en: "Support",     icon: "💬" },
] as const;

function StarBar({ value }: { value: number }) {
  const pct = Math.round((value / 5) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className={`text-lg ${s <= Math.round(value) ? "text-warning" : "text-border"}`}>★</span>
        ))}
      </div>
      <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full bg-warning rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-foreground w-8 text-end">{value}</span>
    </div>
  );
}

export default function SuperAdminRatingsPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ratings")
      .then((r) => r.json())
      .then((d) => { setStats(d ?? null); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-2xl" dir={isAr ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "تقييمات المنصة" : "Platform Ratings"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr
            ? "إحصائيات تقييمات الأطباء للمنصة"
            : "Aggregated ratings from doctors across the platform"}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error || !stats ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">📊</span>
          <p className="text-foreground font-medium">
            {isAr ? "لا توجد تقييمات بعد" : "No ratings yet"}
          </p>
          <p className="text-sm text-muted mt-1">
            {isAr
              ? "ستظهر هنا الإحصائيات بمجرد تقييم الأطباء للمنصة"
              : "Stats will appear once doctors submit ratings"}
          </p>
        </div>
      ) : stats.count === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">📊</span>
          <p className="text-foreground font-medium">{isAr ? "لا توجد تقييمات بعد" : "No ratings yet"}</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-card-border bg-card p-4 text-center shadow-card-sm">
              <p className="text-3xl font-bold text-foreground">{stats.count}</p>
              <p className="text-xs text-muted mt-1">{isAr ? "إجمالي التقييمات" : "Total Ratings"}</p>
            </div>
            <div className="rounded-lg border border-card-border bg-card p-4 text-center shadow-card-sm">
              <p className="text-3xl font-bold text-warning">{stats.overall}</p>
              <p className="text-xs text-muted mt-1">{isAr ? "التقييم العام" : "Overall"}</p>
            </div>
            <div className="rounded-lg border border-card-border bg-card p-4 text-center shadow-card-sm">
              <p className="text-3xl font-bold text-success">{stats.referRate}%</p>
              <p className="text-xs text-muted mt-1">{isAr ? "نسبة التوصية" : "Would Refer"}</p>
            </div>
            <div className="rounded-lg border border-card-border bg-card p-4 text-center shadow-card-sm">
              <p className="text-3xl font-bold text-primary">{stats.ease}</p>
              <p className="text-xs text-muted mt-1">{isAr ? "سهولة الاستخدام" : "Ease of Use"}</p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="rounded-lg border border-card-border bg-card p-6 shadow-card-md space-y-5">
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "تفصيل التقييمات" : "Ratings Breakdown"}
            </h2>
            {CRITERIA.map((c) => (
              <div key={c.key} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span>{c.icon}</span>
                  <p className="text-sm text-muted">{isAr ? c.ar : c.en}</p>
                </div>
                <StarBar value={stats[c.key] as number} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
