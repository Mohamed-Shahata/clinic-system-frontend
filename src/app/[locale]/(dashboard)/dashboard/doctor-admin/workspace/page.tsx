import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { WorkspaceClientPage } from "@/components/dashboard/workspace-client-page";

async function fetchQueue(token: string) {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/appointments/queue`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<
      Array<{
        id: string;
        startsAt: string;
        status: string;
        visitType?: string | null;
        notes?: string | null;
        patient: {
          id: string;
          code: string;
          fullName: string;
          phone?: string | null;
          dateOfBirth?: string | null;
          medicalNotes?: string | null;
        };
        doctor: { id: string; fullName: string };
      }>
    >;
  } catch {
    return [];
  }
}

async function fetchCatalogMedications(token: string) {
  try {
    const res = await fetch(
      `${getBackendBaseUrl()}/api/prescriptions/catalog/medications`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    return res.json() as Promise<
      Array<{
        name: string;
        dose?: string;
        frequency?: string;
        duration?: string;
      }>
    >;
  } catch {
    return [];
  }
}

async function fetchCatalogImaging(token: string) {
  try {
    const res = await fetch(
      `${getBackendBaseUrl()}/api/prescriptions/catalog/imaging`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    return res.json() as Promise<Array<{ name: string }>>;
  } catch {
    return [];
  }
}

async function fetchTemplate(token: string) {
  try {
    const res = await fetch(
      `${getBackendBaseUrl()}/api/prescriptions/template`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (!session) redirect(`/${locale}/login`);
  if (session.role !== "DOCTOR_ADMIN") redirect(`/${locale}/dashboard`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const [queue, catalogMedications, catalogImaging, template] =
    await Promise.all([
      fetchQueue(token),
      fetchCatalogMedications(token),
      fetchCatalogImaging(token),
      fetchTemplate(token),
    ]);

  const doctorInfo = {
    id: session.userId ?? "",
    fullName: session.email ?? "",
    specialty: null as string | null,
  };

  return (
    <WorkspaceClientPage
      locale={locale}
      initialQueue={queue}
      catalogMedications={catalogMedications}
      catalogImaging={catalogImaging}
      template={template}
      doctorInfo={doctorInfo}
    />
  );
}
