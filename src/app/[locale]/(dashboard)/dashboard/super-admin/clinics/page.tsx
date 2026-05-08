import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { Card, CardBody, CardHeader, Badge } from "@/components/ui";
import { ClinicStatusToggle } from "@/components/dashboard/clinic-status-toggle";
import { ClinicDeleteButton } from "@/components/dashboard/clinic-delete-button";
import { CreateClinicButton } from "@/components/dashboard/create-buttons";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

async function fetchClinics(token: string) {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/clinics`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<
      Array<{
        id: string;
        slug: string;
        name: string;
        timezone: string;
        defaultLocale: string;
        isActive: boolean;
        subscription?: {
          plan?: { name: string; code: string };
          expiresAt: string;
          status: string;
        } | null;
        createdAt: string;
        _count: { clinicUsers: number; patients: number };
      }>
    >;
  } catch {
    return [];
  }
}

export default async function ClinicsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const session = await getSessionFromCookies();
  if (!session?.isSuperAdmin) redirect(`/${locale}/login`);

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";
  const clinics = await fetchClinics(token);
  const t = await getTranslations("clinics");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted mt-0.5">{t("description")}</p>
      </div>

      <div className="flex justify-end">
        <CreateClinicButton />
      </div>

      <div>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">
              {t("allClinics")}
              <span className="ml-2 text-xs font-normal text-muted">
                ({clinics.length})
              </span>
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {clinics.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">
                {t("noClinics")}
              </p>
            ) : (
              <div className="divide-y divide-card-border">
                {clinics.map((c) => (
                  <div
                    key={c.id}
                    className="px-5 py-3.5 hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground">
                            {c.name}
                          </p>
                          <Badge variant={c.isActive ? "success" : "danger"}>
                            {c.isActive ? t("active") : t("suspended")}
                          </Badge>
                        </div>
                        <p className="font-mono text-xs text-muted mt-0.5">
                          {c.slug}
                        </p>
                        <p className="text-xs text-primary mt-1">
                          {c.subscription?.plan?.name
                            ? `${c.subscription.plan.name} · ${t("expires")} ${new Date(c.subscription.expiresAt).toLocaleDateString()}`
                            : t("noSubscription")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="default">
                          {c._count.clinicUsers} {t("staff")}
                        </Badge>
                        <Badge variant="muted">
                          {c._count.patients} {t("patientsShort")}
                        </Badge>
                        <ClinicStatusToggle
                          clinicId={c.id}
                          isActive={c.isActive}
                        />
                        <ClinicDeleteButton
                          clinicId={c.id}
                          clinicName={c.name}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs text-muted">
                      <span>{c.timezone}</span>
                      <span>·</span>
                      <span>
                        {c.defaultLocale === "ar"
                          ? isAr
                            ? "عربي"
                            : "Arabic"
                          : isAr
                            ? "إنجليزي"
                            : "English"}
                      </span>
                      <span>·</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
