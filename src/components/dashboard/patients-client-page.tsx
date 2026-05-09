"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Modal,
} from "@/components/ui";
import { CreatePatientButton } from "@/components/dashboard/create-buttons";

type Patient = {
  id: string;
  code: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  createdAt: string;
};

const PAGE_SIZE = 10;

export function PatientsClientPage({
  patients,
  latestStatusMap,
  locale,
}: {
  patients: Patient[];
  latestStatusMap: Record<string, string>;
  locale: string;
}) {
  const isAr = locale === "ar";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const statusLabels: Record<string, string> = {
    BOOKED: isAr ? "قيد الانتظار" : "Waiting",
    IN_PROGRESS: isAr ? "قيد التنفيذ" : "In progress",
    COMPLETED: isAr ? "مكتمل" : "Completed",
    CANCELLED: isAr ? "ملغي" : "Cancelled",
    CHECKED_IN: isAr ? "تم الوصول" : "Checked in",
    IN_QUEUE: isAr ? "في الطابور" : "In queue",
    NO_SHOW: isAr ? "لم يحضر" : "No show",
  };

  const statusVariant = (
    status: string,
  ): "default" | "success" | "warning" | "danger" | "muted" => {
    if (status === "COMPLETED") return "success";
    if (["IN_PROGRESS", "IN_QUEUE", "CHECKED_IN"].includes(status))
      return "warning";
    if (["CANCELLED", "NO_SHOW"].includes(status)) return "danger";
    if (status === "BOOKED") return "default";
    return "muted";
  };

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      `${p.fullName} ${p.phone ?? ""} ${p.code}`.toLowerCase().includes(q),
    );
  }, [patients, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPatients.length / PAGE_SIZE),
  );
  const pagedPatients = filteredPatients.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isAr ? "تسجيل المرضى" : "Patient Registration"}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {isAr
              ? "تسجيل المرضى الجدد وإدارة الملفات"
              : "Register new patients and manage existing records"}
          </p>
        </div>
        <CreatePatientButton allowMedicalNotes={false} />
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder={
            isAr
              ? "بحث بالاسم أو الهاتف أو الرقم…"
              : "Search by name, phone or code…"
          }
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">
            {isAr ? "جميع المرضى" : "All Patients"}{" "}
            <span className="text-muted font-normal">
              ({filteredPatients.length})
            </span>
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {filteredPatients.length === 0 ? (
            <EmptyState
              title={
                search
                  ? isAr
                    ? "لا نتائج"
                    : "No results"
                  : isAr
                    ? "لا يوجد مرضى مسجلين"
                    : "No patients registered"
              }
              description={
                !search
                  ? isAr
                    ? "استخدم زر الإضافة لتسجيل أول مريض."
                    : "Use the add button to register the first patient."
                  : undefined
              }
              icon={
                !search ? (
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <path d="M12 11h4" />
                    <path d="M12 16h4" />
                    <path d="M8 11h.01" />
                    <path d="M8 16h.01" />
                  </svg>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="divide-y divide-card-border">
                {pagedPatients.map((p) => {
                  const status = latestStatusMap[p.id];
                  return (
                    <div
                      key={p.id}
                      className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-2 transition-colors"
                    >
                      <Link
                        href={`/${locale}/dashboard/doctor-admin/patients/${p.id}`}
                        className="min-w-0 flex-1 hover:text-primary transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">
                            {p.fullName}
                          </p>
                          <span className="font-mono text-xs text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                            {p.code}
                          </span>
                          {status && (
                            <Badge variant={statusVariant(status)}>
                              {statusLabels[status] ?? status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {p.phone ?? (isAr ? "لا هاتف" : "No phone")} ·{" "}
                          {p.dateOfBirth
                            ? new Date(p.dateOfBirth).toLocaleDateString(
                                locale === "ar" ? "ar-EG" : "en-GB",
                              )
                            : isAr
                              ? "لا تاريخ ميلاد"
                              : "No DOB"}
                        </p>
                      </Link>
                      <div className="flex items-center gap-2 shrink-0 ms-3">
                        <span className="text-xs text-muted">
                          {new Date(p.createdAt).toLocaleDateString(
                            locale === "ar" ? "ar-EG" : "en-GB",
                          )}
                        </span>
                        <Link
                          href={`/${locale}/dashboard/doctor-admin/patients/${p.id}`}
                          className="inline-flex h-8 items-center rounded border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-surface-2 transition-colors"
                        >
                          {isAr ? "ملف المريض" : "Patient file"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-card-border">
                  <span className="text-xs text-muted">
                    {isAr
                      ? `صفحة ${page} من ${totalPages}`
                      : `Page ${page} of ${totalPages}`}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((prev) => prev - 1)}
                    >
                      {isAr ? "السابق" : "Prev"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((prev) => prev + 1)}
                    >
                      {isAr ? "التالي" : "Next"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
