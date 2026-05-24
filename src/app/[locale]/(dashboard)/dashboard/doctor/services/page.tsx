import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { ServiceCatalogSettings } from "@/components/dashboard/service-catalog-settings";
import { redirect } from "next/navigation";

export default async function DoctorServicesPage({
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
          {isAr ? "الخدمات والأسعار" : "Services & Pricing"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr
            ? "أدر قائمة الخدمات التي تقدمها وأسعارها"
            : "Manage the services you offer and their prices"}
        </p>
      </div>
      <ServiceCatalogSettings />
    </div>
  );
}
