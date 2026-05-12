import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { ExtendSubscriptionForm } from "@/components/dashboard/extend-subscription-form";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function fetchClinics(token: string) {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/clinics`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function ExtendSubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const session = await getSessionFromCookies();
  if (!session?.isSuperAdmin) redirect(`/${locale}/login`);
  const jar = await cookies();
  const clinics = await fetchClinics(jar.get("access_token")?.value ?? "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "تمديد الاشتراك" : "Extend Subscription"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr
            ? "إضافة أيام اشتراك مجانية كهدية أو مناسبة لعيادة محددة أو لجميع العيادات"
            : "Add free subscription days as a gift or occasion for a specific clinic or all clinics"}
        </p>
      </div>
      <ExtendSubscriptionForm initialClinics={clinics} />
    </div>
  );
}
