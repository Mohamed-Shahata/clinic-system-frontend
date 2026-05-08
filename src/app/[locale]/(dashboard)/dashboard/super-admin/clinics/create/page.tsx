import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { redirect } from "next/navigation";

export default async function CreateClinicPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (!session?.isSuperAdmin) redirect(`/${locale}/login`);
  redirect(`/${locale}/dashboard/super-admin/clinics`);
}
