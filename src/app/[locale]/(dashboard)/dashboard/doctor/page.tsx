import { getSessionFromCookies } from "@/lib/auth/get-session-from-cookies";
import { getBackendBaseUrl } from "@/lib/backend-url";
import { Card, CardBody, CardHeader, Badge, EmptyState } from "@/components/ui";
import { StaffActions } from "@/components/dashboard/staff-actions";
import { AddDoctorButton } from "@/components/dashboard/add-doctor-button";
import { DoctorPaymentBadge } from "@/components/dashboard/doctor-payment-badge";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export type ClinicDoctor = {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: "DOCTOR_ADMIN" | "DOCTOR";
  specialty: string | null;
  paymentMode: "FIXED_RENT" | "PERCENTAGE" | null;
  fixedMonthlyRent: number | null;
  adminPercentage: number | null;
  consultationFee: number | null;
  followUpFee: number | null;
  isActive: boolean;
  createdAt: string;
};

async function fetchDoctors(token: string): Promise<ClinicDoctor[]> {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/users/doctors`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<ClinicDoctor[]>;
  } catch {
    return [];
  }
}

export default async function DoctorsManagementPage({
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

  const doctors = await fetchDoctors(token);

  // DOCTOR_ADMIN نفسه في القائمة — بنعرضه بس ما بنديه StaffActions
  const sorted = [
    ...doctors.filter((d) => d.id === session.userId),
    ...doctors.filter((d) => d.id !== session.userId),
  ];

  const clinic = {
    clinicName: session.clinicName ?? "",
    clinicSlug: session.clinicSlug ?? "",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isAr ? "إدارة الأطباء" : "Doctors Management"}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {isAr
              ? "إضافة وإدارة الأطباء العاملين في العيادة"
              : "Add and manage doctors working at your clinic"}
          </p>
        </div>
        <AddDoctorButton clinic={clinic} isAr={isAr} />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">
            {isAr ? "الأطباء" : "Doctors"}{" "}
            <span className="text-muted font-normal">({sorted.length})</span>
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {sorted.length === 0 ? (
            <EmptyState
              title={isAr ? "لا يوجد أطباء" : "No doctors yet"}
              description={
                isAr
                  ? "أضف طبيباً للبدء في إدارة العيادة"
                  : "Add a doctor to start managing your clinic"
              }
            />
          ) : (
            <div className="divide-y divide-card-border">
              {sorted.map((doc) => {
                const isSelf = doc.id === session.userId;
                return (
                  <div
                    key={doc.id}
                    className="px-5 py-4 flex items-start justify-between gap-3 hover:bg-surface-2 transition-colors"
                  >
                    {/* ── Left: info ── */}
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {doc.fullName}
                        </p>
                        {isSelf && (
                          <span className="text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                            {isAr ? "أنت" : "You"}
                          </span>
                        )}
                        {doc.role === "DOCTOR_ADMIN" && (
                          <span className="text-[11px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
                            {isAr ? "مدير" : "Admin"}
                          </span>
                        )}
                      </div>

                      {doc.specialty && (
                        <p className="text-xs text-muted">{doc.specialty}</p>
                      )}

                      <p className="text-xs text-muted font-mono">
                        {doc.email ?? doc.phone ?? "—"}
                      </p>

                      {/* رسوم الكشف */}
                      {(doc.consultationFee || doc.followUpFee) && (
                        <p className="text-xs text-muted">
                          {isAr ? "كشف: " : "Consultation: "}
                          <span className="text-foreground font-medium">
                            {doc.consultationFee ?? "—"}
                          </span>
                          {doc.followUpFee ? (
                            <>
                              {" · "}
                              {isAr ? "متابعة: " : "Follow-up: "}
                              <span className="text-foreground font-medium">
                                {doc.followUpFee}
                              </span>
                            </>
                          ) : null}
                        </p>
                      )}
                    </div>

                    {/* ── Right: badges + actions ── */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant={doc.isActive ? "success" : "muted"}>
                        {doc.isActive
                          ? isAr
                            ? "نشط"
                            : "Active"
                          : isAr
                            ? "غير نشط"
                            : "Inactive"}
                      </Badge>

                      <DoctorPaymentBadge
                        paymentMode={doc.paymentMode}
                        fixedMonthlyRent={doc.fixedMonthlyRent}
                        adminPercentage={doc.adminPercentage}
                        isAr={isAr}
                      />

                      {!isSelf && (
                        <StaffActions
                          userId={doc.id}
                          name={doc.fullName}
                          currentUserId={session.userId}
                        />
                      )}

                      <span className="text-xs text-muted">
                        {new Date(doc.createdAt).toLocaleDateString(
                          isAr ? "ar-EG" : "en-GB",
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
