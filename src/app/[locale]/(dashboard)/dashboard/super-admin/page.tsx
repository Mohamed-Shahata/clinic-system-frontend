import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { Badge, StatCard } from "@/components/ui";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { PlatformAnalytics } from "@/components/dashboard/platform-analytics";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

async function fetchStats(token: string) {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/clinics/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<{
      clinicCount: number;
      userCount: number;
      patientCount: number;
      appointmentCount: number;
      payments: Array<{ status: string; count: number }>;
      plans: Array<{ code: string; name: string; clinicCount: number }>;
      roles: Array<{ role: string; count: number }>;
      monthlyRevenue: Array<{ month: string; amount: number }>;
      currentMonthRevenue: number;
      previousMonthRevenue: number;
      growthRate: number;
    }>;
  } catch {
    return null;
  }
}

async function fetchClinics(token: string) {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/clinics`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<
      Array<{
        id: string;
        slug: string;
        name: string;
        isActive: boolean;
        createdAt: string;
        _count: { clinicUsers: number; patients: number };
      }>
    >;
  } catch {
    return [];
  }
}

export default async function SuperAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const session = await getSessionFromCookies();
  if (!session?.isSuperAdmin) redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const [stats, clinics] = await Promise.all([
    fetchStats(token),
    fetchClinics(token),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "نظرة عامة على المنصة" : "Platform Overview"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr
            ? "إحصائيات فورية عبر جميع العيادات"
            : "Real-time stats across all tenants"}
        </p>
      </div>

      <PlatformAnalytics
        plans={stats?.plans ?? []}
        payments={stats?.payments ?? []}
        roles={stats?.roles ?? []}
        monthlyRevenue={stats?.monthlyRevenue ?? []}
        currentMonthRevenue={stats?.currentMonthRevenue ?? 0}
        previousMonthRevenue={stats?.previousMonthRevenue ?? 0}
        growthRate={stats?.growthRate ?? 0}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label={isAr ? "إجمالي العيادات" : "Total Clinics"}
          value={stats?.clinicCount ?? "—"}
          color="primary"
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            </svg>
          }
        />
        <StatCard
          label={isAr ? "إجمالي الطاقم" : "Total Staff"}
          value={stats?.userCount ?? "—"}
          color="success"
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label={isAr ? "إجمالي المرضى" : "Total Patients"}
          value={stats?.patientCount ?? "—"}
          color="warning"
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "إجراءات سريعة" : "Quick Actions"}
          </h2>
        </CardHeader>
        <CardBody>
          <div className="flex gap-4">
            <a
              href={`/${locale}/dashboard/super-admin/clinics`}
              className="px-4 py-2 bg-primary text-primary-fg rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {isAr ? "إدارة العيادات" : "Manage Clinics"}
            </a>
            <a
              href={`/${locale}/dashboard/super-admin/subscription-requests`}
              className="px-4 py-2 bg-surface text-foreground rounded-md text-sm font-medium hover:bg-surface-2 transition-colors"
            >
              {isAr ? "مراجعة المدفوعات" : "Review Payments"}
            </a>
          </div>
        </CardBody>
      </Card>

      {/* Recent clinics table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "أحدث العيادات" : "Recent Clinics"}
            </h2>
            <a
              href={`/${locale}/dashboard/super-admin/clinics`}
              className="text-xs text-primary hover:underline"
            >
              {isAr ? "عرض الكل →" : "View all →"}
            </a>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {clinics.length === 0 ? (
            <p className="px-5 py-8 text-sm text-center text-muted">
              {isAr
                ? "لا توجد عيادات بعد. أنشئ أول عيادة."
                : "No clinics yet. Create the first one."}
            </p>
          ) : (
            <div className="divide-y divide-card-border">
              {clinics.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors"
                >
                  {/* Avatar */}
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-muted font-mono">{c.slug}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted">
                      {c._count.clinicUsers} {isAr ? "موظف" : "staff"} ·{" "}
                      {c._count.patients} {isAr ? "مريض" : "pts"}
                    </span>
                    <Badge variant={c.isActive ? "success" : "danger"}>
                      {c.isActive
                        ? isAr
                          ? "نشطة"
                          : "Active"
                        : isAr
                          ? "موقوفة"
                          : "Off"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
