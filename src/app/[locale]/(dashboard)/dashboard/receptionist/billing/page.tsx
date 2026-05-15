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

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (session?.role !== "RECEPTIONIST") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const [patients, invoices] = await Promise.all([
    api<Array<{ id: string; code: string; fullName: string }>>(
      token,
      "/api/patients",
      [],
    ),
    api<unknown[]>(token, "/api/billing/invoices", []),
  ]);

  return (
    <BillingClientPage
      patients={patients}
      invoices={invoices as never}
      locale={locale}
    />
  );
}
