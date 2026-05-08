import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { ProfileSettingsForm } from "@/components/dashboard/profile-settings-form";
import { SubscriptionPlansAdmin } from "@/components/dashboard/subscription-plans-admin";
import { AppearanceSettings } from "@/components/dashboard/appearance-settings";
import { redirect } from "next/navigation";

export default async function SuperAdminSettingsPage({
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
          {isAr ? "الإعدادات" : "Settings"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr
            ? "بيانات الحساب وإدارة باقات الاشتراك"
            : "Account details and subscription plan pricing"}
        </p>
      </div>
      <AppearanceSettings locale={locale} />
      <ProfileSettingsForm />
      <SubscriptionPlansAdmin locale={locale} />
    </div>
  );
}
