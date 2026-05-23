import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { ProfileSettingsForm } from "@/components/dashboard/profile-settings-form";
import { AppearanceSettings } from "@/components/dashboard/appearance-settings";
import { redirect } from "next/navigation";

export default async function DoctorSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR") redirect(`/${locale}/login`);
  const isAr = locale === "ar";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "الإعدادات" : "Settings"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr ? "بيانات حسابك الشخصي" : "Your account details"}
        </p>
      </div>
      <AppearanceSettings locale={locale} />
      <ProfileSettingsForm />
    </div>
  );
}
