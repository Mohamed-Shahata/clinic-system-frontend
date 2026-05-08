import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { Card, CardBody, CardHeader, Badge, EmptyState } from "@/components/ui";
import { StaffActions } from "@/components/dashboard/staff-actions";
import { AddReceptionistButton } from "@/components/dashboard/add-receptionist-button";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

async function fetchReceptionists(token: string) {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/users/receptionists`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<
      Array<{
        id: string;
        email: string | null;
        phone: string | null;
        fullName: string;
        isActive: boolean;
        createdAt: string;
      }>
    >;
  } catch {
    return [];
  }
}

export default async function ReceptionistsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionFromCookies();
  if (session?.role !== "DOCTOR_ADMIN") redirect(`/${locale}/login`);
  const isAr = locale === "ar";

  const jar = await cookies();
  const token = jar.get("access_token")?.value ?? "";
  const receptionists = (await fetchReceptionists(token)).filter(
    (item) => item.id !== session.userId,
  );
  const t = await getTranslations("dashboard.receptionistsManagement");

  const clinic = {
    clinicName: session.clinicName ?? "",
    clinicSlug: session.clinicSlug ?? "",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted mt-0.5">{t("description")}</p>
        </div>
        {/* ✅ زر إضافة موظف استقبال */}
        <AddReceptionistButton clinic={clinic} isAr={isAr} />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">
            {t("listTitle")}{" "}
            <span className="text-muted font-normal">
              ({receptionists.length})
            </span>
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {receptionists.length === 0 ? (
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          ) : (
            <div className="divide-y divide-card-border">
              {receptionists.map((r) => (
                <div
                  key={r.id}
                  className="px-5 py-3.5 flex items-start justify-between gap-3 hover:bg-surface-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {r.fullName}
                    </p>
                    {/* ✅ عرض email أو phone حسب اللي موجود */}
                    <p className="text-xs text-muted font-mono">
                      {r.email ?? r.phone ?? "—"}
                    </p>
                    {r.email && r.phone && (
                      <p className="text-xs text-muted font-mono">{r.phone}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant={r.isActive ? "success" : "muted"}>
                      {r.isActive
                        ? isAr
                          ? "نشط"
                          : "Active"
                        : isAr
                          ? "غير نشط"
                          : "Inactive"}
                    </Badge>
                    <StaffActions
                      userId={r.id}
                      name={r.fullName}
                      currentUserId={session.userId}
                    />
                    <span className="text-xs text-muted">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
