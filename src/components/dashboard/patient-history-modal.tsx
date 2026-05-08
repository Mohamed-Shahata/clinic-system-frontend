"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Badge, Button, Alert } from "@/components/ui";

type PatientSummary = {
  id: string;
  code: string;
  fullName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  medicalNotes?: string | null;
  createdAt: string;
};

type PatientDetails = PatientSummary & {
  appointments?: Array<{
    id: string;
    startsAt: string;
    status: string;
    visitType: string;
    notes?: string | null;
    doctor?: { fullName: string };
  }>;
  prescriptions?: Array<{
    id: string;
    diagnosis?: string | null;
    issuedAt: string;
    doctor?: { fullName: string };
  }>;
  attachments?: Array<{ id: string; fileName: string; uploadedAt: string }>;
};

export function PatientHistoryModal({ patient }: { patient: PatientSummary }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<PatientDetails | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function showDetails() {
    setOpen(true);
    if (details || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : isAr ? "تعذر تحميل تاريخ المريض" : "Could not load patient history");
        return;
      }
      setDetails(data as PatientDetails);
    } finally {
      setPending(false);
    }
  }

  const p = details ?? patient;

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={showDetails}>
        {isAr ? "عرض" : "View"}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-lg border border-card-border bg-card shadow-card-md">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">{p.fullName}</h2>
                  <Badge variant="muted">{p.code}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {p.phone ?? (isAr ? "لا يوجد هاتف" : "No phone")} · {isAr ? "تاريخ الميلاد" : "DOB"}: {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : "-"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  {isAr ? "إغلاق" : "Close"}
                </Button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              {pending && <p className="text-sm text-muted">{isAr ? "جارٍ تحميل سجل المريض..." : "Loading patient history..."}</p>}
              {error && <Alert variant="error">{error}</Alert>}
              {!pending && !error && (
                <div className="space-y-5">
                  <section>
                    <h3 className="text-sm font-semibold text-foreground">{isAr ? "ملاحظات طبية" : "Medical Notes"}</h3>
                    <p className="mt-2 rounded border border-border bg-surface p-3 text-sm text-foreground">
                      {p.medicalNotes || (isAr ? "لا توجد ملاحظات طبية." : "No medical notes recorded.")}
                    </p>
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold text-foreground">{isAr ? "المواعيد" : "Appointments"}</h3>
                    <div className="mt-2 divide-y divide-card-border rounded border border-card-border">
                      {(details?.appointments ?? []).length === 0 ? (
                        <p className="p-3 text-sm text-muted">{isAr ? "لا توجد مواعيد." : "No appointments found."}</p>
                      ) : (
                        details?.appointments?.map((a) => (
                          <div key={a.id} className="p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-foreground">{new Date(a.startsAt).toLocaleString()}</span>
                              <Badge variant="default">{a.status}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted">{a.doctor?.fullName ?? (isAr ? "طبيب" : "Doctor")} · {a.visitType}</p>
                            {a.notes && <p className="mt-1 text-xs text-foreground/70">{a.notes}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold text-foreground">{isAr ? "الوصفات الطبية" : "Prescriptions"}</h3>
                    <div className="mt-2 divide-y divide-card-border rounded border border-card-border">
                      {(details?.prescriptions ?? []).length === 0 ? (
                        <p className="p-3 text-sm text-muted">{isAr ? "لا توجد وصفات." : "No prescriptions found."}</p>
                      ) : (
                        details?.prescriptions?.map((rx) => (
                          <div key={rx.id} className="p-3 text-sm">
                            <p className="font-medium text-foreground">{rx.diagnosis || (isAr ? "وصفة طبية" : "Prescription")}</p>
                            <p className="mt-1 text-xs text-muted">{new Date(rx.issuedAt).toLocaleString()} · {rx.doctor?.fullName ?? (isAr ? "طبيب" : "Doctor")}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
