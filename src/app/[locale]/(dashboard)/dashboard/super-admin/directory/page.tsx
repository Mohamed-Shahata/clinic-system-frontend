import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { PlatformDirectoryFilters } from "@/components/dashboard/platform-directory-filters";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

async function fetchClinics(token: string) {
  const res = await fetch(`${getBackendBaseUrl()}/api/clinics`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json() as Promise<
    Array<{ id: string; name: string; slug: string }>
  >;
}

export default async function DirectoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (!session?.isSuperAdmin) redirect(`/${locale}/login`);
  const jar = await cookies();
  const clinics = await fetchClinics(jar.get("access_token")?.value ?? "");
  const t = await getTranslations("directory");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted mt-0.5">{t("description")}</p>
      </div>
      <PlatformDirectoryFilters clinics={clinics} />
    </div>
  );
}
