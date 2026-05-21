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

  const [patientRes, clinicRes, templateRes] = await Promise.all([
    fetch(`${getBackendBaseUrl()}/api/patients/${patientId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null),
    session?.clinicId
      ? fetch(`${getBackendBaseUrl()}/api/clinics/${session.clinicId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).catch(() => null)
      : Promise.resolve(null),
    fetch(`${getBackendBaseUrl()}/api/prescriptions/template`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null),
  ]);

  if (!patientRes || !patientRes.ok) notFound();
  const patient = await patientRes.json().catch(() => null);
  if (!patient) notFound();

  const clinicData = clinicRes?.ok
    ? await clinicRes.json().catch(() => null)
    : null;
  const templateData = templateRes?.ok
    ? await templateRes.json().catch(() => null)
    : null;

  return (
    <PatientDetailClient
      locale={locale}
      patient={patient}
      clinicLogo={clinicData?.logoUrl ?? null}
      clinicNameEn={clinicData?.nameEn ?? clinicData?.name ?? null}
      template={templateData}
    />
  );
}
