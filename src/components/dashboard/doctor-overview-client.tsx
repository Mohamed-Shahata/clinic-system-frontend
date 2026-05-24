"use client";

import { useMemo } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { formatNumber, formatPercent } from "@/lib/dashboard-format";

type MonthlyStats = {
  month: string;
  monthlyGross: number;
  monthlyDeduction: number;
  monthlyNet: number;
  prevMonthNet: number;
  netChangePercent: number | null;
  todayTotal: number;
  todayCompleted: number;
  todayInQueue: number;
  todayInProgress: number;
  totalPatients: number;
  paymentMode: string | null;
  adminFixed: number;
  adminPct: number;
  recentInvoices: Array<{
    patientName: string;
    gross: number;
    net: number;
    deducted: number;
    createdAt: string;
  }>;
  dailyChart: Array<{ day: number; gross: number; net: number }>;
};

function fmt(n: number, locale: string) {
  return formatNumber(n, locale) + " EGP";
}

function MonthLabel(month: string, isAr: boolean) {
  const [y, m] = month.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

/* ── Tiny bar chart ── */
function MiniBarChart({
  data,
  isAr,
}: {
  data: Array<{ day: number; gross: number; net: number }>;
  isAr: boolean;
}) {
  const max = Math.max(...data.map((d) => d.gross), 1);
  const today = new Date().getDate();
  return (
    <div className="flex items-end gap-[3px] h-20 w-full">
      {data.map((d) => {
        const grossH = Math.max(2, (d.gross / max) * 80);
        const netH = Math.max(1, (d.net / max) * 80);
        const isToday = d.day === today;
        return (
          <div
            key={d.day}
            className="relative flex-1 flex flex-col items-center justify-end group"
            title={`${isAr ? "يوم" : "Day"} ${d.day}: ${fmt(d.gross, isAr ? "ar" : "en")}`}
          >
            {/* gross bar (background) */}
            <div
              className="w-full rounded-sm opacity-30"
              style={{
                height: grossH,
                backgroundColor: isToday
                  ? "var(--color-primary)"
                  : "var(--color-primary)",
              }}
            />
            {/* net bar (foreground, overlayed) */}
            <div
              className="absolute bottom-0 w-full rounded-sm"
              style={{
                height: netH,
                backgroundColor: isToday
                  ? "var(--color-primary)"
                  : "var(--color-success)",
                opacity: isToday ? 1 : 0.75,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ── Donut ── */
function Donut({
  completed,
  inProgress,
  inQueue,
  total,
}: {
  completed: number;
  inProgress: number;
  inQueue: number;
  total: number;
}) {
  if (total === 0)
    return (
      <div className="h-28 w-28 rounded-full border-4 border-card-border flex items-center justify-center text-xs text-muted">
        —
      </div>
    );
  const pct = (n: number) => Math.round((n / total) * 100);
  const c = pct(completed);
  const p = pct(inProgress);
  const q = pct(inQueue);
  // conic-gradient: completed=success, inProgress=warning, inQueue=muted
  const grad = `conic-gradient(
    var(--color-success) 0% ${c}%,
    var(--color-warning) ${c}% ${c + p}%,
    var(--color-muted-border, #e5e7eb) ${c + p}% 100%
  )`;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <div className="h-28 w-28 rounded-full" style={{ background: grad }} />
      {/* hole */}
      <div className="absolute inset-[18px] rounded-full bg-surface flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-foreground leading-none">
          {total}
        </span>
        <span className="text-[9px] text-muted leading-none mt-0.5">
          visits
        </span>
      </div>
    </div>
  );
}

/* ── Stat pill ── */
function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "primary" | "success" | "warning" | "danger" | "muted";
}) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    muted: "bg-surface-2 text-muted",
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${colors[color]}`}>
      <p className="text-xs opacity-70 font-medium">{label}</p>
      <p className="text-xl font-bold leading-snug">{value}</p>
    </div>
  );
}

/* ── Change badge ── */
function ChangeBadge({ pct, locale }: { pct: number | null; locale: string }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
        up ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
      }`}
    >
      {up ? "▲" : "▼"} {formatPercent(Math.abs(pct), locale)}
    </span>
  );
}

export function DoctorOverviewClient({
  stats,
  doctorName,
  locale,
}: {
  stats: MonthlyStats | null;
  doctorName: string;
  locale: string;
}) {
  const isAr = locale === "ar";

  const monthLabel = useMemo(
    () => (stats ? MonthLabel(stats.month, isAr) : ""),
    [stats, isAr],
  );

  const policyLabel = useMemo(() => {
    if (!stats) return null;
    if (stats.paymentMode === "FIXED_RENT") return null;
    if (stats.paymentMode === "PERCENTAGE")
      return isAr
        ? `خصم نسبة: ${formatPercent(stats.adminPct, locale)}`
        : `Percentage deduction: ${formatPercent(stats.adminPct, locale)}`;
    return null;
  }, [stats, isAr, locale]);

  if (!stats) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* header skeleton */}
        <div className="space-y-1.5">
          <div className="h-5 w-32 rounded bg-border" />
          <div className="h-3.5 w-48 rounded bg-border" />
        </div>
        {/* stat pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-border/60" />
          ))}
        </div>
        {/* chart + today */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-44 rounded-xl bg-border/60" />
          <div className="h-44 rounded-xl bg-border/60" />
        </div>
        {/* comparison */}
        <div className="h-28 rounded-xl bg-border/60" />
        {/* recent invoices */}
        <div className="rounded-xl bg-border/60 overflow-hidden">
          <div className="h-10 bg-border/80" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 border-t border-border/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isAr ? "نظرة عامة" : "Overview"}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {monthLabel}
            {policyLabel && (
              <span className="ms-2 text-xs bg-surface-2 rounded px-1.5 py-0.5">
                {policyLabel}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill
          label={isAr ? "إجمالي الشهر" : "Month gross"}
          value={fmt(stats.monthlyGross, locale)}
          color="primary"
        />
        <StatPill
          label={isAr ? "صافي دخلك" : "Your net"}
          value={fmt(stats.monthlyNet, locale)}
          color="success"
        />
        <StatPill
          label={isAr ? "خصم العيادة" : "Clinic cut"}
          value={fmt(stats.monthlyDeduction, locale)}
          color="danger"
        />
        <StatPill
          label={isAr ? "إجمالي مرضاك" : "Total patients"}
          value={stats.totalPatients}
          color="muted"
        />
      </div>

      {/* Middle row: chart + today donut */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Daily earnings chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {isAr
                  ? "الإيرادات اليومية — الشهر الحالي"
                  : "Daily earnings — this month"}
              </h2>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm opacity-40 bg-primary" />
                  {isAr ? "إجمالي" : "Gross"}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-success" />
                  {isAr ? "صافي" : "Net"}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <MiniBarChart data={stats.dailyChart} isAr={isAr} />
            <div className="flex justify-between mt-1 text-[10px] text-muted">
              <span>1</span>
              <span>{Math.ceil(stats.dailyChart.length / 2)}</span>
              <span>{stats.dailyChart.length}</span>
            </div>
          </CardBody>
        </Card>

        {/* Today card */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">
              {isAr ? "إحصائيات اليوم" : "Today"}
            </h2>
          </CardHeader>
          <CardBody className="flex flex-col items-center gap-4">
            <Donut
              completed={stats.todayCompleted}
              inProgress={stats.todayInProgress}
              inQueue={stats.todayInQueue}
              total={stats.todayTotal}
            />
            <div className="grid grid-cols-3 gap-2 w-full text-center text-xs">
              <div>
                <p className="text-success font-bold text-base">
                  {stats.todayCompleted}
                </p>
                <p className="text-muted">{isAr ? "منتهية" : "Done"}</p>
              </div>
              <div>
                <p className="text-warning font-bold text-base">
                  {stats.todayInProgress}
                </p>
                <p className="text-muted">{isAr ? "جارية" : "Active"}</p>
              </div>
              <div>
                <p className="text-foreground font-bold text-base">
                  {stats.todayInQueue}
                </p>
                <p className="text-muted">{isAr ? "منتظرة" : "Queue"}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Month comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {isAr ? "مقارنة بالشهر الماضي" : "vs. last month"}
            </h2>
            <ChangeBadge pct={stats.netChangePercent} locale={locale} />
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-xs text-muted mb-0.5">
                {isAr ? "الشهر الماضي (صافي)" : "Last month (net)"}
              </p>
              <p className="text-lg font-semibold text-foreground">
                {fmt(stats.prevMonthNet, locale)}
              </p>
            </div>
            <div className="text-muted text-lg">→</div>
            <div>
              <p className="text-xs text-muted mb-0.5">
                {isAr ? "هذا الشهر (صافي)" : "This month (net)"}
              </p>
              <p className="text-lg font-semibold text-primary">
                {fmt(stats.monthlyNet, locale)}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Recent invoices */}
      {stats.recentInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">
              {isAr ? "آخر الفواتير هذا الشهر" : "Recent invoices this month"}
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border bg-surface-2">
                    <th className="px-4 py-2 text-start text-xs text-muted font-medium">
                      {isAr ? "المريض" : "Patient"}
                    </th>
                    <th className="px-4 py-2 text-end text-xs text-muted font-medium">
                      {isAr ? "إجمالي" : "Gross"}
                    </th>
                    <th className="px-4 py-2 text-end text-xs text-muted font-medium">
                      {isAr ? "خصم العيادة" : "Clinic cut"}
                    </th>
                    <th className="px-4 py-2 text-end text-xs text-muted font-medium">
                      {isAr ? "صافيك" : "Your net"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentInvoices.map((inv, i) => (
                    <tr
                      key={i}
                      className="border-b border-card-border last:border-0 hover:bg-surface-2/50 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground">
                          {inv.patientName}
                        </p>
                        <p className="text-xs text-muted">
                          {new Date(inv.createdAt).toLocaleDateString(
                            isAr ? "ar-EG" : "en-US",
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-end text-foreground">
                        {fmt(inv.gross, locale)}
                      </td>
                      <td className="px-4 py-2.5 text-end text-danger">
                        {inv.deducted > 0
                          ? `− ${fmt(inv.deducted, locale)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-end text-success font-semibold">
                        {fmt(inv.net, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
