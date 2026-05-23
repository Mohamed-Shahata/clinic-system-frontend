import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { ReportsPdfButton } from "@/components/dashboard/reports-pdf-button";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui";
import {
  formatNumber,
  formatPercent,
  paymentMethodLabel,
} from "@/lib/dashboard-format";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

type DoctorEarningRow = {
  doctorUserId: string;
  doctorName: string;
  role: string;
  paymentMode: "FIXED_RENT" | "PERCENTAGE" | null;
  fixedMonthlyRent: string | null;
  adminPercentage: string | null;
  patientCount: number;
  grossAmount: number;
  deduction: number;
  netAmount: number;
  adminCollected?: number;
};

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

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR_ADMIN") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const [appointments, invoices, doctorEarnings] = await Promise.all([
    api<
      Array<{
        id: string;
        status: string;
        startsAt: string;
        doctor?: { id: string; fullName: string } | null;
      }>
    >(token, "/api/appointments", []),
    api<
      Array<{
        id: string;
        totalAmount: string;
        createdAt: string;
        paymentMethod: string;
      }>
    >(token, "/api/billing/invoices", []),
    api<DoctorEarningRow[]>(token, "/api/billing/doctor-earnings", []),
  ]);

  const revenue = invoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount || 0),
    0,
  );
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const pending = appointments.filter((a) => a.status === "IN_QUEUE").length;

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

  // Payment method breakdown
  const paymentBreakdown = invoices.reduce<Record<string, number>>(
    (acc, inv) => {
      const method = (inv.paymentMethod ?? "unknown").toLowerCase();
      acc[method] = (acc[method] ?? 0) + Number(inv.totalAmount || 0);
      return acc;
    },
    {},
  );
  const allowedPaymentBreakdown = Object.fromEntries(
    Object.entries(paymentBreakdown).filter(([m]) =>
      ["cash", "vodafone_cash"].includes(m),
    ),
  );

  // Per-doctor appointment counts (for PDF + display)
  const apptByDoctor = appointments.reduce<
    Record<string, { name: string; count: number; completed: number }>
  >((acc, a) => {
    const id = a.doctor?.id ?? "unknown";
    const name = a.doctor?.fullName ?? (isAr ? "غير محدد" : "Unknown");
    if (!acc[id]) acc[id] = { name, count: 0, completed: 0 };
    acc[id].count++;
    if (a.status === "COMPLETED") acc[id].completed++;
    return acc;
  }, {});

  const casesByDoctor = Object.values(apptByDoctor).map((d) => ({
    doctor: d.name,
    count: d.count,
  }));

  // Only non-admin doctors for the comparison table
  const otherDoctors = doctorEarnings.filter((d) => d.role !== "DOCTOR_ADMIN");
  const adminDoctor = doctorEarnings.find((d) => d.role === "DOCTOR_ADMIN");
  const totalClinicCollected = adminDoctor?.adminCollected ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isAr ? "تقارير العيادة" : "Clinic Reports"}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {isAr
              ? "الإيرادات وإحصائيات الأطباء"
              : "Revenue and doctor statistics"}
          </p>
        </div>
        <ReportsPdfButton
          locale={locale}
          clinicName={session?.clinicName}
          revenue={revenue}
          invoicesCount={invoices.length}
          completedCount={completed}
          pendingCount={pending}
          casesByDoctor={casesByDoctor}
          monthlyRevenue={monthlyRevenue}
          paymentBreakdown={paymentBreakdown}
        />
      </div>

      {/* ── Summary stats ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={isAr ? "إجمالي الإيراد" : "Total Revenue"}
          value={`${formatNumber(revenue, locale)} EGP`}
          icon={<span />}
        />
        <StatCard
          label={isAr ? "عدد الفواتير" : "Invoices"}
          value={formatNumber(invoices.length, locale)}
          color="success"
          icon={<span />}
        />
        <StatCard
          label={isAr ? "زيارات مكتملة" : "Completed Visits"}
          value={formatNumber(completed, locale)}
          color="warning"
          icon={<span />}
        />
        <StatCard
          label={isAr ? "مستحق للعيادة" : "Clinic Collected"}
          value={`${formatNumber(totalClinicCollected, locale)} EGP`}
          color="primary"
          icon={<span />}
        />
      </div>

      {/* ── Per-doctor earnings table ── */}
      {doctorEarnings.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "إيرادات الأطباء" : "Doctor Revenue Breakdown"}
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-tertiary)] text-xs text-muted">
                    <th className="px-4 py-2.5 text-start font-medium">
                      {isAr ? "الطبيب" : "Doctor"}
                    </th>
                    <th className="px-4 py-2.5 text-start font-medium">
                      {isAr ? "آلية الدفع" : "Payment Mode"}
                    </th>
                    <th className="px-4 py-2.5 text-end font-medium">
                      {isAr ? "المرضى" : "Patients"}
                    </th>
                    <th className="px-4 py-2.5 text-end font-medium">
                      {isAr ? "الإيرادات" : "Revenue"}
                    </th>
                    <th className="px-4 py-2.5 text-end font-medium">
                      {isAr ? "نصيب العيادة" : "Clinic Share"}
                    </th>
                    <th className="px-4 py-2.5 text-end font-medium">
                      {isAr ? "صافي الطبيب" : "Doctor Net"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-tertiary)]">
                  {doctorEarnings.map((row) => {
                    const isAdmin = row.role === "DOCTOR_ADMIN";
                    return (
                      <tr
                        key={row.doctorUserId}
                        className={`hover:bg-[var(--color-surface-2)] transition-colors ${isAdmin ? "bg-[var(--color-background-secondary)]" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {row.doctorName}
                            </span>
                            {isAdmin && (
                              <span className="text-[11px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
                                {isAr ? "مدير" : "Admin"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted text-xs">
                          {row.paymentMode === "FIXED_RENT"
                            ? `${isAr ? "إيجار " : "Rent "}${formatNumber(Number(row.fixedMonthlyRent ?? 0), locale)}`
                            : row.paymentMode === "PERCENTAGE"
                              ? `${row.adminPercentage}%`
                              : "—"}
                        </td>
                        <td className="px-4 py-3 text-end font-mono text-foreground">
                          {formatNumber(row.patientCount, locale)}
                        </td>
                        <td className="px-4 py-3 text-end font-mono text-foreground">
                          {formatNumber(row.grossAmount, locale)}
                        </td>
                        <td className="px-4 py-3 text-end font-mono text-[var(--color-text-info)]">
                          {isAdmin
                            ? formatNumber(row.adminCollected ?? 0, locale)
                            : formatNumber(row.deduction, locale)}
                        </td>
                        <td className="px-4 py-3 text-end font-mono text-[var(--color-text-success)]">
                          {formatNumber(row.netAmount, locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {doctorEarnings.length > 1 && (
                  <tfoot>
                    <tr className="border-t-2 border-[var(--color-border-secondary)] text-xs font-semibold">
                      <td className="px-4 py-2.5" colSpan={3}>
                        {isAr ? "الإجمالي" : "Total"}
                      </td>
                      <td className="px-4 py-2.5 text-end font-mono">
                        {formatNumber(
                          doctorEarnings.reduce((s, r) => s + r.grossAmount, 0),
                          locale,
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-end font-mono text-[var(--color-text-info)]">
                        {formatNumber(totalClinicCollected, locale)}
                      </td>
                      <td className="px-4 py-2.5 text-end font-mono text-[var(--color-text-success)]">
                        {formatNumber(
                          doctorEarnings.reduce((s, r) => s + r.netAmount, 0),
                          locale,
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Per-doctor appointments ── */}
      {Object.keys(apptByDoctor).length > 1 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "الحجوزات لكل طبيب" : "Appointments per Doctor"}
            </h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {Object.values(apptByDoctor).map((d) => {
              const completedPct =
                d.count > 0 ? Math.round((d.completed / d.count) * 100) : 0;
              return (
                <div key={d.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium">
                      {d.name}
                    </span>
                    <span className="text-muted text-xs">
                      {formatNumber(d.completed, locale)}/
                      {formatNumber(d.count, locale)} (
                      {formatPercent(completedPct, locale)}{" "}
                      {isAr ? "مكتملة" : "completed"})
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-2)]">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{ width: `${completedPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Monthly revenue */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "الإيراد الشهري" : "Monthly Revenue"}
            </h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {monthlyRevenue.length === 0 ? (
              <p className="text-sm text-muted">
                {isAr ? "لا توجد بيانات" : "No data available"}
              </p>
            ) : (
              monthlyRevenue.map(([month, amount]) => {
                const max = Math.max(...monthlyRevenue.map(([, v]) => v), 1);
                const pct = Math.round((amount / max) * 100);
                return (
                  <div key={month} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{month}</span>
                      <span className="font-medium text-foreground">
                        {formatNumber(amount, locale)} EGP
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-2)]">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>

        {/* Payment methods */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "طرق الدفع" : "Payment Methods"}
            </h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {Object.entries(allowedPaymentBreakdown).length === 0 ? (
              <p className="text-sm text-muted">
                {isAr ? "لا توجد بيانات" : "No data available"}
              </p>
            ) : (
              (() => {
                const total = Object.values(allowedPaymentBreakdown).reduce(
                  (s, v) => s + v,
                  0,
                );
                return Object.entries(allowedPaymentBreakdown).map(
                  ([method, amount]) => {
                    const pct =
                      total > 0 ? Math.round((amount / total) * 100) : 0;
                    return (
                      <div key={method} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">
                            {paymentMethodLabel(method, locale)}
                          </span>
                          <span className="font-medium text-foreground">
                            {formatNumber(amount, locale)} EGP{" "}
                            <span className="text-muted text-xs">
                              ({formatPercent(pct, locale)})
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-2)]">
                          <div
                            className="h-1.5 rounded-full bg-primary/60"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  },
                );
              })()
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
