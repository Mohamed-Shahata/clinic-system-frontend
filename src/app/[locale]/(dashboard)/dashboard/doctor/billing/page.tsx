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

export default async function DoctorBillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const [patientsPayload, invoices] = await Promise.all([
    api<
      | Array<{ id: string; code: string; fullName: string }>
      | {
          data: Array<{ id: string; code: string; fullName: string }>;
          nextCursor: string | null;
        }
    >(token, "/api/patients", []),
    // Backend filters invoices by issuedById for DOCTOR role
    api<unknown[]>(token, "/api/billing/invoices", []),
  ]);

  const patients = Array.isArray(patientsPayload)
    ? patientsPayload
    : patientsPayload.data;

  return (
    <BillingClientPage
      patients={patients}
      invoices={invoices as never}
      locale={locale}
      clinicName={session?.clinicName ?? ""}
    />
  );
}
