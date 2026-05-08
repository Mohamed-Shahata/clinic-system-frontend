import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { CatalogManager } from "@/components/dashboard/catalog-manager";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function DoctorAdminMedicationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR_ADMIN") redirect(`/${locale}/login`);
  const t = await getTranslations("dashboard.catalog");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {t("medicationsTitle")}
        </h1>
        <p className="text-sm text-muted mt-0.5">{t("medicationsDesc")}</p>
      </div>
      <CatalogManager kind="medications" />
    </div>
  );
}
