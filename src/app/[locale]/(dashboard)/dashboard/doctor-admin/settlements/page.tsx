import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SettlementsClientPage } from "@/components/dashboard/settlements-client-page";

export type DoctorSettlementRow = {
  doctorUserId: string;
  doctorName: string;
  specialty: string | null;
  paymentMode: "FIXED_RENT" | "PERCENTAGE" | null;
  fixedMonthlyRent: number;
  adminPercentage: number;
  totalRevenue: number;
  clinicShare: number;
  doctorNet: number;
  status: "PENDING" | "PAID" | "PARTIAL" | "NOT_SETTLED";
  paidAmount: number;
  month: string;
  settlement: {
    id: string;
    paidAt: string | null;
    paymentMethod: string | null;
    notes: string | null;
  } | null;
};

async function fetchSettlements(
  token: string,
  month: string,
): Promise<DoctorSettlementRow[]> {
  try {
    const res = await fetch(
      `${getBackendBaseUrl()}/api/billing/settlements?month=${month}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    return res.json() as Promise<DoctorSettlementRow[]>;
  } catch {
    return [];
  }
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function SettlementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { locale } = await params;
  const { month: qMonth } = await searchParams;

  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR_ADMIN") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";
  const month = qMonth ?? currentMonth();

  const rows = await fetchSettlements(token, month);

  return (
    <SettlementsClientPage
      rows={rows}
      month={month}
      locale={locale}
    />
  );
}
