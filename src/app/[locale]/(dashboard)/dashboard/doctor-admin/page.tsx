import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { StatCard } from "@/components/ui";
import { DoctorAdminAnalytics } from "@/components/dashboard/doctor-admin-analytics";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

async function fetchPatients(token: string) {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/patients`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<Array<{ id: string; fullName: string; phone?: string; createdAt: string }>>;
  } catch { return []; }
}

async function fetchReceptionists(token: string) {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/users/receptionists`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<Array<{ id: string; fullName: string; isActive: boolean }>>;
  } catch { return []; }
}

async function fetchInvoices(token: string) {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/billing/invoices`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<Array<{ createdAt: string; totalAmount: string | number }>>;
  } catch { return []; }
}

export default async function DoctorAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR_ADMIN") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const [patients, receptionists, invoices] = await Promise.all([
    fetchPatients(token),
    fetchReceptionists(token),
    fetchInvoices(token),
  ]);

  const monthlyRevenue = Object.values(
    invoices.reduce<Record<string, { month: string; amount: number }>>((acc, item) => {
      const d = new Date(item.createdAt);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!acc[month]) acc[month] = { month, amount: 0 };
      acc[month].amount += Number(item.totalAmount ?? 0);
      return acc;
    }, {}),
  ).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{session.clinicName ?? "Clinic"} Dashboard</h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr ? "إدارة مرضى وموظفي العيادة" : "Manage your clinic's staff and patients"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label={isAr ? "السكرتيرة" : "Receptionists"}
          value={receptionists.length}
          color="primary"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label={isAr ? "المرضى" : "Patients"}
          value={patients.length}
          color="success"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>}
        />
      </div>

      <DoctorAdminAnalytics
        patients={patients.map((p) => ({ createdAt: p.createdAt }))}
        monthlyRevenue={monthlyRevenue}
      />
    </div>
  );
}
