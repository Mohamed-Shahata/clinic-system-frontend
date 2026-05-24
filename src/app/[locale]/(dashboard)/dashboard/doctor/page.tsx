import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DoctorOverviewClient } from "@/components/dashboard/doctor-overview-client";

async function fetchDoctorStats(token: string) {
  try {
    const res = await fetch(
      `${getBackendBaseUrl()}/api/billing/doctor-monthly-stats`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchProfile(token: string) {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return {};
    return res.json() as Promise<{ fullName?: string; specialty?: string }>;
  } catch {
    return {};
  }
}

export default async function DoctorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR") redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";

  const [stats, profile] = await Promise.all([
    fetchDoctorStats(token),
    fetchProfile(token),
  ]);

  return (
    <DoctorOverviewClient
      stats={stats}
      doctorName={profile.fullName ?? ""}
      locale={locale}
    />
  );
}
