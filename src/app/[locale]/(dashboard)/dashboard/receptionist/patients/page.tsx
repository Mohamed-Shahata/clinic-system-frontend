import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { PatientsVisitedPage } from "@/components/dashboard/patients-visited-page";
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

export default async function ReceptionPatientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (session?.role !== "RECEPTIONIST") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const [patientsPayload, appointments] = await Promise.all([
    api<
      | Array<{
        id: string;
        code: string;
        fullName: string;
        phone?: string;
        dateOfBirth?: string;
        createdAt: string;
      }>
      | {
          data: Array<{
            id: string;
            code: string;
            fullName: string;
            phone?: string;
            dateOfBirth?: string;
            createdAt: string;
          }>;
          nextCursor: string | null;
        }
    >(token, "/api/patients", []),
    api<
      Array<{
        id: string;
        patientId: string;
        status: string;
        startsAt: string;
        doctor: { fullName: string };
      }>
    >(token, "/api/appointments", []),
  ]);
  // FIX: Backend now returns paginated patients; unwrap first page for existing client.
  const patients = Array.isArray(patientsPayload)
    ? patientsPayload
    : patientsPayload.data;

  return (
    <PatientsVisitedPage
      patients={patients}
      appointments={appointments}
      locale={locale}
    />
  );
}
