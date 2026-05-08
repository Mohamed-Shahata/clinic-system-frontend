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
    <div className="space-y-3">
      <div className="mx-auto h-32 w-32 rounded-full" style={{ background: `conic-gradient(${gradient})` }} />
      {points.map((point) => (
        <div key={point.label} className="space-y-1">
          <div className="flex justify-between text-xs items-center">
            <span className="text-foreground flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: point.color }} />{point.label}</span>
            <span className="text-muted">{point.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const revenuePoints = useMemo(() => monthlyRevenue.slice(-Number(filter)), [monthlyRevenue, filter]);

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-foreground">{isAr ? "نمو الإيرادات" : "Revenue Growth"}</h2></CardHeader>
        <CardBody className="space-y-2">
          <p className="text-xs text-muted">{isAr ? "الشهر الحالي" : "Current month"}: {currentMonthRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted">{isAr ? "الشهر السابق" : "Previous month"}: {previousMonthRevenue.toLocaleString()}</p>
          <p className={`text-sm font-semibold ${growthRate >= 0 ? "text-success" : "text-danger"}`}>
            {growthRate >= 0 ? "+" : ""}{growthRate.toFixed(1)}%
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{isAr ? "النطاق" : "Range"}</span>
              <select value={filter} onChange={(e) => setFilter(e.target.value as "3" | "6" | "12")} className="h-7 rounded border border-border bg-surface px-2 text-xs">
                <option value="3">{isAr ? "3 أشهر" : "3 months"}</option>
                <option value="6">{isAr ? "6 أشهر" : "6 months"}</option>
                <option value="12">{isAr ? "12 شهر" : "12 months"}</option>
              </select>
            </div>
            {revenuePoints.map((item) => (
              <div key={item.month} className="flex justify-between text-xs">
                <span>{item.month}</span>
                <span>{item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-foreground">{isAr ? "العيادات حسب الباقة" : "Clinics by Plan"}</h2></CardHeader>
        <CardBody><Donut points={plans.map((p, i) => ({ label: p.name, value: p.clinicCount, color: ["#6366f1", "#14b8a6", "#f59e0b", "#8b5cf6"][i % 4] }))} /></CardBody>
      </Card>
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-foreground">{isAr ? "طلبات الدفع" : "Payment Requests"}</h2></CardHeader>
        <CardBody><Donut points={payments.map((p, i) => ({ label: p.status, value: p.count, color: ["#22c55e", "#f59e0b", "#ef4444"][i % 3] }))} /></CardBody>
      </Card>
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-foreground">{isAr ? "أدوار الطاقم" : "Staff Roles"}</h2></CardHeader>
        <CardBody><Donut points={roles.map((r, i) => ({ label: r.role, value: r.count, color: ["#06b6d4", "#a855f7", "#f97316"][i % 3] }))} /></CardBody>
      </Card>
    </div>
  );
}
