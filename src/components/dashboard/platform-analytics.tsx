"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Card, CardBody, CardHeader } from "@/components/ui";

type Point = { label: string; value: number; color: string };

function Donut({ points }: { points: Point[] }) {
  const total = points.reduce((sum, p) => sum + p.value, 0) || 1;
  const gradient = points
    .reduce(
      (acc, point) => {
        const start = acc.offset;
        const end = start + (point.value / total) * 100;
        acc.parts.push(`${point.color} ${start}% ${end}%`);
        acc.offset = end;
        return acc;
      },
      { offset: 0, parts: [] as string[] },
    )
    .parts.join(", ");

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Donut */}
      <div
        className="h-28 w-28 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      />
      {/* Legend */}
      <div className="w-full space-y-1.5">
        {points.map((p) => (
          <div
            key={p.label}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate text-xs text-foreground">
                {p.label}
              </span>
            </div>
            <span className="shrink-0 text-xs font-semibold text-muted tabular-nums">
              {p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FILTER_OPTIONS = [
  { value: "3", labelAr: "3 أشهر", labelEn: "3 months" },
  { value: "6", labelAr: "6 أشهر", labelEn: "6 months" },
  { value: "12", labelAr: "12 شهر", labelEn: "12 months" },
] as const;

export function PlatformAnalytics({
  plans,
  payments,
  roles,
  monthlyRevenue,
  currentMonthRevenue,
  previousMonthRevenue,
  growthRate,
}: {
  plans: Array<{ name: string; clinicCount: number }>;
  payments: Array<{ status: string; count: number }>;
  roles: Array<{ role: string; count: number }>;
  monthlyRevenue: Array<{ month: string; amount: number }>;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  growthRate: number;
}) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [filter, setFilter] = useState<"3" | "6" | "12">("6");
  const revenuePoints = useMemo(
    () => monthlyRevenue.slice(-Number(filter)),
    [monthlyRevenue, filter],
  );

  const isPositive = growthRate >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* ── Revenue Growth ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "نمو الإيرادات" : "Revenue Growth"}
            </h2>
            {/* Pill filter */}
            <div className="flex gap-1 rounded-lg bg-surface-2 p-0.5 border border-border">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilter(opt.value)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                    filter === opt.value
                      ? "bg-primary text-primary-fg shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {isAr ? opt.labelAr : opt.labelEn}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {/* Growth badge */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted">
                {isAr ? "الشهر الحالي" : "This month"}
              </p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {currentMonthRevenue.toLocaleString()}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                isPositive
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              }`}
            >
              {isPositive ? "+" : ""}
              {growthRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-muted">
            {isAr ? "الشهر السابق" : "Last month"}:{" "}
            <span className="font-medium text-foreground">
              {previousMonthRevenue.toLocaleString()}
            </span>
          </p>

          {/* Mini bar chart */}
          {revenuePoints.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-border">
              {revenuePoints.map((item) => {
                const max = Math.max(...revenuePoints.map((r) => r.amount), 1);
                const pct = Math.round((item.amount / max) * 100);
                return (
                  <div key={item.month} className="flex items-center gap-2">
                    <span className="w-10 shrink-0 text-[10px] text-muted text-end">
                      {item.month}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-[10px] text-muted tabular-nums">
                      {item.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Clinics by Plan ── */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "العيادات حسب الباقة" : "Clinics by Plan"}
          </h2>
        </CardHeader>
        <CardBody>
          <Donut
            points={plans.map((p, i) => ({
              label: p.name,
              value: p.clinicCount,
              color: ["#6366f1", "#14b8a6", "#f59e0b", "#8b5cf6"][i % 4],
            }))}
          />
        </CardBody>
      </Card>

      {/* ── Payment Requests ── */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "طلبات الدفع" : "Payment Requests"}
          </h2>
        </CardHeader>
        <CardBody>
          <Donut
            points={payments.map((p, i) => ({
              label: p.status,
              value: p.count,
              color: ["#22c55e", "#f59e0b", "#ef4444"][i % 3],
            }))}
          />
        </CardBody>
      </Card>

      {/* ── Staff Roles ── */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "أدوار الطاقم" : "Staff Roles"}
          </h2>
        </CardHeader>
        <CardBody>
          <Donut
            points={roles.map((r, i) => ({
              label: r.role,
              value: r.count,
              color: ["#06b6d4", "#a855f7", "#f97316"][i % 3],
            }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}
