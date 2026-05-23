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

export default async function DoctorAppointmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  // Backend now filters by doctorId for DOCTOR role automatically
  const [patientsPayload, appointments, profile] = await Promise.all([
    api<
      | Array<{ id: string; code: string; fullName: string; phone?: string | null }>
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
    api<{ fullName?: string; specialty?: string }>(
      token,
      "/api/users/profile",
      {},
    ),
  ]);

  const patients = Array.isArray(patientsPayload)
    ? patientsPayload
    : patientsPayload.data;

  // DOCTOR books appointments for themselves only
  const selfAsDoctor = session.userId
    ? [
        {
          id: session.userId,
          fullName: profile.fullName ?? "",
          specialty: profile.specialty ?? null,
        },
      ]
    : [];

  return (
    <AppointmentsClientPage
      patients={patients}
      doctors={selfAsDoctor}
      appointments={appointments}
      locale={locale}
    />
  );
}
