import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { ReportsPdfButton } from "@/components/dashboard/reports-pdf-button";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui";
import { formatNumber, formatPercent, paymentMethodLabel } from "@/lib/dashboard-format";
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

  const [appointments, invoices] = await Promise.all([
    api<Array<{ id: string; status: string; startsAt: string }>>(
      token,
      "/api/appointments",
      [],
    ),
    api<
      Array<{
        id: string;
        totalAmount: string;
        createdAt: string;
        paymentMethod: string;
      }>
    >(token, "/api/billing/invoices", []),
  ]);

  const revenue = invoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount || 0),
    0,
  );
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const pending = appointments.filter((a) => a.status === "IN_QUEUE").length;

  // Monthly revenue breakdown
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
    Object.entries(paymentBreakdown).filter(([method]) =>
      ["cash", "vodafone_cash"].includes(method),
    ),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isAr ? "تقارير العيادة" : "Clinic Reports"}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {isAr
              ? "الإيرادات وإحصائيات الحجوزات"
              : "Revenue and appointment statistics"}
          </p>
        </div>
        <ReportsPdfButton
          locale={locale}
          clinicName={session?.clinicName}
          revenue={revenue}
          invoicesCount={invoices.length}
          completedCount={completed}
          pendingCount={pending}
          casesByDoctor={[]}
          monthlyRevenue={monthlyRevenue}
          paymentBreakdown={paymentBreakdown}
        />
      </div>

      {/* Summary stats */}
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
          label={isAr ? "حجوزات قيد الانتظار" : "Pending Appointments"}
          value={formatNumber(pending, locale)}
          color="primary"
          icon={<span />}
        />
      </div>

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
                    <div className="h-1.5 w-full rounded-full bg-surface-2">
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

        {/* Payment method breakdown */}
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
                            <span className="text-muted text-xs">({formatPercent(pct, locale)})</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-surface-2">
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
