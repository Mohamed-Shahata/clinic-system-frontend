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
  patient?: { fullName: string; code: string; phone?: string | null } | null;
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

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (session?.role !== "RECEPTIONIST") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const [patients, doctors, appointments] = await Promise.all([
    api<
      Array<{
        id: string;
        code: string;
        fullName: string;
        phone?: string | null;
      }>
    >(token, "/api/patients", []),
    api<Array<{ id: string; fullName: string; specialty: string | null }>>(
      token,
      "/api/users/doctors",
      [],
    ),
    api<Appointment[]>(token, "/api/appointments", []),
  ]);

  return (
    <AppointmentsClientPage
      patients={patients}
      doctors={doctors}
      appointments={appointments}
      locale={locale}
    />
  );
}
