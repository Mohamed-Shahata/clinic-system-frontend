import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { ExtendSubscriptionForm } from "@/components/dashboard/extend-subscription-form";
import { redirect } from "next/navigation";

export default async function ExtendSubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const session = await getSessionFromCookies();
  if (!session?.isSuperAdmin) redirect(`/${locale}/login`);

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
      <ExtendSubscriptionForm />
    </div>
  );
}
