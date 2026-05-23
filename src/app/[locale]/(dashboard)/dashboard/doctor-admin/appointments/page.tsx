import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { AppointmentsClientPage } from "@/components/dashboard/appointments-client-page";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  patient?: {
    id: string;
    fullName: string;
    code: string;
    phone?: string | null;
  } | null;
  doctor?: { id: string; fullName: string } | null;
  visitType?: string | null;
  notes?: string | null;
};

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

export default async function DoctorAdminAppointmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR_ADMIN") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  // DOCTOR_ADMIN sees all clinic appointments — fetch all doctors for filter + booking
  const [patientsPayload, appointments, doctors] = await Promise.all([
    api<
      | Array<{
          id: string;
          code: string;
          fullName: string;
          phone?: string | null;
        }>
      | {
          data: Array<{
            id: string;
            code: string;
            fullName: string;
            phone?: string | null;
          }>;
          nextCursor: string | null;
        }
    >(token, "/api/patients", []),
    api<Appointment[]>(token, "/api/appointments", []),
    api<
      Array<{
        id: string;
        fullName: string;
        specialty: string | null;
        consultationFee: number | null;
        followUpFee: number | null;
        isActive: boolean;
      }>
    >(token, "/api/users/doctors", []),
  ]);

  const patients = Array.isArray(patientsPayload)
    ? patientsPayload
    : patientsPayload.data;

  // Only active doctors in booking form
  const activeDoctors = doctors
    .filter((d) => d.isActive)
    .map((d) => ({
      id: d.id,
      fullName: d.fullName,
      specialty: d.specialty,
      consultationFee: d.consultationFee,
      followUpFee: d.followUpFee,
    }));

  return (
    <AppointmentsClientPage
      patients={patients}
      doctors={activeDoctors}
      appointments={appointments}
      locale={locale}
    />
  );
}
