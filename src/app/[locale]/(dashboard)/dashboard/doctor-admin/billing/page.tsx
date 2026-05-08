import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { BillingClientPage } from "@/components/dashboard/billing-client-page";
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

type Invoice = {
  id: string;
  patientId?: string;
  totalAmount: string;
  paymentMethod: string;
  services?: unknown;
  createdAt: string;
  patient?: { fullName: string; code: string } | null;
};

export default async function DoctorAdminBillingPage({
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

  // DOCTOR_ADMIN sees only their own patients — backend filters automatically
  const [patients, invoices] = await Promise.all([
    api<Array<{ id: string; code: string; fullName: string }>>(
      token,
      "/api/patients",
      [],
    ),
    api<Invoice[]>(token, "/api/billing/invoices", []),
  ]);

  return (
    <BillingClientPage
      patients={patients}
      invoices={invoices}
      locale={locale}
      isAr={isAr}
    />
  );
}
