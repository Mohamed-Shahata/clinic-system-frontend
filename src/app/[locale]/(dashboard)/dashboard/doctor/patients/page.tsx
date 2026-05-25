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
    // Backend filters patients by doctorId for DOCTOR role automatically
    return Array.isArray(payload) ? payload : payload.data;
  } catch {
    return [];
  }
}

export default async function DoctorPatientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const patients = await fetchPatients(token);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "مرضاي" : "My Patients"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr
            ? "المرضى الذين أجريت لهم كشفاً أو لديهم مواعيد معك"
            : "Patients you have seen or have appointments with"}
        </p>
      </div>

      {/* ✅ FIX: Pass patientBasePath="doctor" so links go to the correct role path */}
      <PatientSearchList initialPatients={patients} patientBasePath="doctor" />
    </div>
  );
}
