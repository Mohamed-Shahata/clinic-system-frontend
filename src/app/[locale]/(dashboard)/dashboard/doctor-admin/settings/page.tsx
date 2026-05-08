import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { ClinicSettingsForm } from "@/components/dashboard/clinic-settings-form";
import { ProfileSettingsForm } from "@/components/dashboard/profile-settings-form";
import { CreateReceptionistButton } from "@/components/dashboard/create-buttons";
import { AppearanceSettings } from "@/components/dashboard/appearance-settings";
import { SubscriptionTimer } from "@/components/dashboard/subscription-timer";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR_ADMIN") redirect(`/${locale}/login`);
  const isAr = locale === "ar";
  const clinic =
    session.clinicName && session.clinicSlug
      ? { clinicName: session.clinicName, clinicSlug: session.clinicSlug }
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "الإعدادات" : "Settings"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr
            ? "تحكم في إعدادات العيادة وبيانات الحساب"
            : "Manage clinic settings and profile information"}
        </p>
      </div>
      <div className="space-y-6">
        {/* Subscription Timer */}
        <SubscriptionTimer />

        {/* Appearance */}
        <AppearanceSettings locale={locale} />

        <div className="rounded-lg border border-card-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "إدارة الفريق والاشتراك" : "Team and subscription"}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {isAr
              ? "إضافة موظفي الاستقبال وتجديد الاشتراك من هنا."
              : "Create receptionists and manage subscription from here."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {clinic ? <CreateReceptionistButton clinic={clinic} /> : null}
            <Link
              href={`/${locale}/dashboard/doctor-admin/subscription`}
              className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-surface-2"
            >
              {isAr ? "صفحة الاشتراك" : "Subscription page"}
            </Link>
          </div>
        </div>

        <ClinicSettingsForm
          name={session.clinicName ?? ""}
          timezone="Africa/Cairo"
          defaultLocale="ar"
        />
        <ProfileSettingsForm />
      </div>
    </div>
  );
}
