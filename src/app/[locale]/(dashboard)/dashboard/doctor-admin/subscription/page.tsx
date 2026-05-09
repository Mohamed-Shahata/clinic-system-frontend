import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SubscriptionClientPage } from "@/components/dashboard/subscription-client-page";

async function fetchData(token: string) {
  const [subRes, plansRes] = await Promise.all([
    fetch(`${getBackendBaseUrl()}/api/billing/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null),
    fetch(`${getBackendBaseUrl()}/api/billing/subscription-plans`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null),
  ]);

  const subscription =
    subRes?.ok && subRes.status !== 204
      ? await subRes.json().catch(() => null)
      : null;

  const plans = plansRes?.ok ? await plansRes.json().catch(() => []) : [];

  return { subscription, plans };
}

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (!session?.clinicId || session.role !== "DOCTOR_ADMIN")
    redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";
  const { subscription, plans } = await fetchData(token);

  return (
    <SubscriptionClientPage
      locale={locale}
      initialSubscription={subscription}
      plans={plans}
    />
  );
}
