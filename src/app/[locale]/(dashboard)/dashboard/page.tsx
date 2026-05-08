import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getDashboardHref } from "@/lib/auth/dashboard-path";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function DashboardIndexPage({ params }: Props) {
  const { locale } = await params;
  const claims = await getSessionFromCookies();
  if (!claims?.sub) redirect(`/${locale}/login`);

  // Redirect immediately to the role-specific dashboard
  const target = getDashboardHref(locale, claims);
  redirect(target);
}
