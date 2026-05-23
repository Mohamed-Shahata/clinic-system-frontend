import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui";
import { formatNumber, formatPercent } from "@/lib/dashboard-format";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

async function api<T>(token: string, path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${getBackendBaseUrl()}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return fallback;
    return res.json() as Promise<T>;
  } catch {
    return fallback;
  }
}

export default async function DoctorReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  // Backend filters by doctorId for DOCTOR role automatically
  const [appointments, invoices, monthlyStats] = await Promise.all([
    api<Array<{ id: string; status: string; startsAt: string }>>(
      token, "/api/appointments", [],
    ),
    api<Array<{ id: string; totalAmount: string; createdAt: string; paymentMethod: string }>>(
      token, "/api/billing/invoices", [],
    ),
    api<{
      monthlyGross: number;
      monthlyDeduction: number;
      monthlyNet: number;
      prevMonthNet: number;
      netChangePercent: number | null;
      paymentMode: string | null;
      adminFixed: number;
      adminPct: number;
    }>(token, "/api/billing/doctor-monthly-stats", {
      monthlyGross: 0, monthlyDeduction: 0, monthlyNet: 0,
      prevMonthNet: 0, netChangePercent: null,
      paymentMode: null, adminFixed: 0, adminPct: 0,
    }),
  ]);

  const revenue = invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const cancelled = appointments.filter((a) => a.status === "CANCELLED").length;
  const completionRate = appointments.length > 0
    ? Math.round((completed / appointments.length) * 100)
    : 0;

  // Monthly revenue (last 6 months)
  const monthlyMap = invoices.reduce<Record<string, number>>((acc, inv) => {
    const d = new Date(inv.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] ?? 0) + Number(inv.totalAmount || 0);
    return acc;
  }, {});
  const monthlyRevenue = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6) as Array<[string, number]>;

  // Deduction label
  const deductionLabel =
    monthlyStats.paymentMode === "FIXED_RENT"
      ? isAr ? `إيجار ثابت: ${formatNumber(monthlyStats.adminFixed, locale)}` : `Fixed Rent: ${formatNumber(monthlyStats.adminFixed, locale)}`
      : monthlyStats.paymentMode === "PERCENTAGE"
        ? isAr ? `نسبة العيادة: ${monthlyStats.adminPct}%` : `Clinic Share: ${monthlyStats.adminPct}%`
        : isAr ? "لا يوجد استقطاع" : "No deduction";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "تقاريري" : "My Reports"}
        </h1>
        <p className="text-sm text-muted mt-0.5">{deductionLabel}</p>
      </div>

      {/* ── This month ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={isAr ? "إيرادات هذا الشهر" : "This Month Revenue"}
          value={`${formatNumber(monthlyStats.monthlyGross, locale)} EGP`}
          icon={<span />}
        />
        <StatCard
          label={isAr ? "صافي الطبيب" : "My Net"}
          value={`${formatNumber(monthlyStats.monthlyNet, locale)} EGP`}
          color="success"
          icon={<span />}
        />
        <StatCard
          label={isAr ? "مواعيد مكتملة" : "Completed Visits"}
          value={formatNumber(completed, locale)}
          color="warning"
          icon={<span />}
        />
        <StatCard
          label={isAr ? "نسبة الإنجاز" : "Completion Rate"}
          value={formatPercent(completionRate, locale)}
          color="primary"
          icon={<span />}
        />
      </div>

      {/* ── Deduction breakdown ── */}
      {monthlyStats.monthlyDeduction > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">
              {isAr ? "تفصيل الشهر الحالي" : "Current Month Breakdown"}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: isAr ? "إجمالي الإيرادات" : "Gross Revenue", value: monthlyStats.monthlyGross, color: "text-foreground" },
                { label: isAr ? "نصيب العيادة" : "Clinic Share", value: monthlyStats.monthlyDeduction, color: "text-[var(--color-text-danger)]" },
                { label: isAr ? "صافيك" : "Your Net", value: monthlyStats.monthlyNet, color: "text-[var(--color-text-success)]" },
              ].map((c) => (
                <div key={c.label}>
                  <p className="text-xs text-muted mb-1">{c.label}</p>
                  <p className={`text-lg font-semibold font-mono ${c.color}`}>
                    {formatNumber(c.value, locale)}
                  </p>
                </div>
              ))}
            </div>
            {monthlyStats.netChangePercent !== null && (
              <p className={`text-xs text-center mt-3 ${monthlyStats.netChangePercent >= 0 ? "text-[var(--color-text-success)]" : "text-[var(--color-text-danger)]"}`}>
                {monthlyStats.netChangePercent >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(monthlyStats.netChangePercent)}%{" "}
                {isAr ? "مقارنة بالشهر الماضي" : "vs last month"}
              </p>
            )}
          </CardBody>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Monthly revenue chart */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">{isAr ? "الإيراد الشهري" : "Monthly Revenue"}</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {monthlyRevenue.length === 0 ? (
              <p className="text-sm text-muted">{isAr ? "لا توجد بيانات" : "No data"}</p>
            ) : monthlyRevenue.map(([month, amount]) => {
              const max = Math.max(...monthlyRevenue.map(([, v]) => v), 1);
              const pct = Math.round((amount / max) * 100);
              return (
                <div key={month} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{month}</span>
                    <span className="font-medium font-mono">{formatNumber(amount, locale)} EGP</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-2)]">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Appointment status */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">{isAr ? "إحصائيات المواعيد" : "Appointment Stats"}</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {[
              { label: isAr ? "مكتملة" : "Completed", count: completed, color: "bg-[var(--color-background-success)]" },
              { label: isAr ? "ملغية" : "Cancelled", count: cancelled, color: "bg-[var(--color-background-danger)]" },
              { label: isAr ? "الإجمالي" : "Total", count: appointments.length, color: "bg-primary" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                  <span className="text-sm text-foreground">{s.label}</span>
                </div>
                <span className="text-sm font-mono font-medium">{formatNumber(s.count, locale)}</span>
              </div>
            ))}
            {appointments.length > 0 && (
              <div className="pt-2 border-t border-[var(--color-border-tertiary)]">
                <div className="flex justify-between text-xs text-muted">
                  <span>{isAr ? "نسبة الإنجاز" : "Completion rate"}</span>
                  <span className="font-medium text-foreground">{formatPercent(completionRate, locale)}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-[var(--color-surface-2)]">
                  <div className="h-1.5 rounded-full bg-[var(--color-background-success)]" style={{ width: `${completionRate}%` }} />
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
