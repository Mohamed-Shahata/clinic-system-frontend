import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { PatientDetailClient } from "@/components/dashboard/patient-detail-client";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ locale: string; patientId: string }>;
}) {
  const { locale, patientId } = await params;
  const session = await getSessionFromCookies();
  if (!session?.clinicId) redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const res = await fetch(`${getBackendBaseUrl()}/api/patients/${patientId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);

  if (!res || !res.ok) notFound();
  const patient = await res.json().catch(() => null);
  if (!patient) notFound();

  return <PatientDetailClient locale={locale} patient={patient} />;
}
