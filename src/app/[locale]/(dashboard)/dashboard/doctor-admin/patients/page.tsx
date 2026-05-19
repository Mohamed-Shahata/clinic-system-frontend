import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { PatientSearchList } from "@/components/dashboard/patient-search-list";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

async function fetchPatients(token: string) {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/patients`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const payload = (await res.json()) as
      | {
          data: Array<{
            id: string;
            code: string;
            fullName: string;
            phone?: string;
            dateOfBirth?: string;
            medicalNotes?: string;
            createdAt: string;
          }>;
          nextCursor: string | null;
        }
      | Array<{
          id: string;
          code: string;
          fullName: string;
          phone?: string;
          dateOfBirth?: string;
          medicalNotes?: string;
          createdAt: string;
        }>;
    // FIX: Backend now returns paginated patients; unwrap first page for existing client.
    return Array.isArray(payload) ? payload : payload.data;
  } catch {
    return [];
  }
}

export default async function DoctorAdminPatientsPage({
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

  const patients = await fetchPatients(token);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "سجلات المرضى" : "Patient Records"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr ? "إدارة مرضى العيادة" : "Manage clinic patients"}
        </p>
      </div>

      <PatientSearchList initialPatients={patients} />
    </div>
  );
}
