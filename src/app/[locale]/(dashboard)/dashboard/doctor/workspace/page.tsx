import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { WorkspaceClientPage } from "@/components/dashboard/workspace-client-page";

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

export default async function DoctorWorkspacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const [queue, catalogMedications, catalogImaging, template, profile] =
    await Promise.all([
      api<
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
      >(token, "/api/appointments/queue", []),
      api<
        Array<{
          name: string;
          dose?: string;
          frequency?: string;
          duration?: string;
        }>
      >(token, "/api/prescriptions/catalog/medications", []),
      api<Array<{ name: string }>>(
        token,
        "/api/prescriptions/catalog/imaging",
        [],
      ),
      api<object | null>(token, "/api/prescriptions/template", null),
      api<{ fullName?: string; specialty?: string }>(
        token,
        "/api/users/profile",
        {},
      ),
    ]);

  const doctorInfo = {
    id: session.userId ?? "",
    fullName: profile.fullName ?? session.email ?? "",
    specialty: profile.specialty ?? null,
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
