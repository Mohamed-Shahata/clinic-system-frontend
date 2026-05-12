"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui";
import {
  appointmentStatusLabel,
  formatNumber,
  numberLocale,
} from "@/lib/dashboard-format";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt?: string;
  status: string;
  visitType?: string | null;
  notes?: string;
  doctor?: { id: string; fullName: string };
};

type Prescription = {
  id: string;
  issuedAt: string;
  appointmentId?: string | null;
  diagnosis?: string;
  medications: string | object;
  notes?: string;
  doctor?: { id: string; fullName: string };
};

type Attachment = {
  id: string;
  appointmentId?: string | null;
  name: string;
  url: string;
  mimeType?: string;
  uploadedAt: string;
};

type Patient = {
  id: string;
  code?: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  medicalNotes?: string;
  createdAt: string;
  appointments?: Appointment[];
  prescriptions?: Prescription[];
  attachments?: Attachment[];
};

interface Props {
  locale: string;
  patient: Patient;
}

function statusLabel(status: string, isAr: boolean) {
  return appointmentStatusLabel(status, isAr ? "ar" : "en");
}

function statusVariant(status: string) {
  const map: Record<string, "success" | "danger" | "warning" | "muted"> = {
    COMPLETED: "success",
    CANCELLED: "danger",
    IN_QUEUE: "warning",
    IN_PROGRESS: "success",
  };
  return map[status] ?? "muted";
}

function formatMedicationValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(formatMedicationValue).filter(Boolean).join("، ");
  if (typeof value === "object") {
    return Object.values(value)
      .map(formatMedicationValue)
      .filter(Boolean)
      .join(" — ");
  }
  return String(value);
}

function parseMedications(raw: string | object): string[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return parsed.map((m) =>
        typeof m === "string"
          ? m
          : [m.name, m.dose, m.frequency, m.duration, m.instructions, m.notes]
              .filter(Boolean)
              .map(formatMedicationValue)
              .join(" — "),
      ).filter(Boolean);
    }
    if (typeof parsed === "object") {
      return Object.entries(parsed)
        .map(([k, v]) => `${k}: ${formatMedicationValue(v)}`)
        .filter(Boolean);
    }
    return [String(parsed)];
  } catch {
    return [String(raw)];
  }
}

function parsePrescriptionPayload(raw: string | object) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as {
        medications?: unknown;
        notes?: unknown;
        requestedTests?: unknown;
        requestedImaging?: unknown;
      };
      return {
        medications: parseMedications(obj.medications as string | object),
        notes: typeof obj.notes === "string" ? obj.notes : "",
        tests: Array.isArray(obj.requestedTests)
          ? obj.requestedTests.map(formatMedicationValue).filter(Boolean)
          : [],
        imaging: Array.isArray(obj.requestedImaging)
          ? obj.requestedImaging.map(formatMedicationValue).filter(Boolean)
          : [],
      };
    }
  } catch {
    // Fall back to treating the whole value as medication text.
  }
  return {
    medications: parseMedications(raw),
    notes: "",
    tests: [] as string[],
    imaging: [] as string[],
  };
}

function fileUrl(file: Attachment) {
  return file.url.startsWith("http")
    ? file.url
    : `/api/upload?url=${encodeURIComponent(file.url)}`;
}

function isImage(file: Attachment) {
  return file.mimeType?.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
}

function isPdf(file: Attachment) {
  return file.mimeType === "application/pdf" || /\.pdf$/i.test(file.name);
}

function InfoBlock({
  title,
  value,
  compact = false,
}: {
  title: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "mt-3 border-t border-card-border pt-3"}>
      <p className="text-xs font-semibold text-muted">{title}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
        {value}
      </p>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted">{title}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="rounded-md border border-card-border bg-card px-2 py-1 text-xs leading-5 text-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function FileGrid({
  files,
  isAr,
  onPreview,
}: {
  files: Attachment[];
  isAr: boolean;
  onPreview: (file: Attachment) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {files.map((file) => (
        <button
          key={file.id}
          type="button"
          onClick={() => onPreview(file)}
          className="overflow-hidden rounded-lg border border-card-border bg-card text-start transition-colors hover:bg-surface-2"
        >
          <div className="flex aspect-[4/3] items-center justify-center bg-surface-2">
            {isImage(file) ? (
              <img
                src={fileUrl(file)}
                alt={file.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold text-muted">
                {isPdf(file) ? "PDF" : isAr ? "ملف" : "File"}
              </span>
            )}
          </div>
          <div className="p-2">
            <p className="truncate text-xs font-medium text-foreground">
              {file.name}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              {new Date(file.uploadedAt).toLocaleDateString(
                isAr ? "ar-EG" : "en-GB",
              )}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function PatientDetailClient({ locale, patient }: Props) {
  const isAr = locale === "ar";
  const [activeTab, setActiveTab] = useState<
    "timeline" | "prescriptions" | "attachments"
  >("timeline");
  const [attachments, setAttachments] = useState(patient.attachments ?? []);
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const appointments = patient.appointments ?? [];
  const prescriptions = patient.prescriptions ?? [];
  const completedVisits = appointments.filter((a) => a.status === "COMPLETED");
  const lastVisit = appointments[0];
  const lastPrescription = prescriptions[0];
  const recentMedications = prescriptions
    .flatMap((p) => parsePrescriptionPayload(p.medications).medications)
    .filter(Boolean)
    .slice(0, 6);

  // Build unified visit timeline
  const age = patient.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(patient.dateOfBirth).getTime()) /
          (365.25 * 24 * 3600 * 1000),
      )
    : null;

  function visitTypeLabel(type?: string | null) {
    const labels: Record<string, [string, string]> = {
      NEW_VISIT: ["زيارة جديدة", "New visit"],
      FOLLOW_UP: ["متابعة", "Follow up"],
      CONSULTATION: ["استشارة", "Consultation"],
      WALK_IN: ["زيارة مباشرة", "Walk-in"],
    };
    return (labels[type ?? ""] ?? [isAr ? "زيارة" : "Visit", "Visit"])[isAr ? 0 : 1];
  }

  function prescriptionsForVisit(appt: Appointment) {
    return prescriptions.filter(
      (p) => p.appointmentId === appt.id || sameDay(p.issuedAt, appt.startsAt),
    );
  }

  function attachmentsForVisit(appt: Appointment) {
    return attachments.filter(
      (a) => a.appointmentId === appt.id || sameDay(a.uploadedAt, appt.startsAt),
    );
  }

  function exportPDF() {
    const isArLang = locale === "ar";
    const dir = isArLang ? "rtl" : "ltr";
    const lang = isArLang ? "ar" : "en";

    const medsHTML = prescriptions
      .map((p) => {
        const payload = parsePrescriptionPayload(p.medications);
        const meds = payload.medications;
        return `
          <div class="visit-card">
            <div class="visit-header">
              <span class="visit-date">${new Date(p.issuedAt).toLocaleDateString(numberLocale(locale))}</span>
              <span class="visit-doctor">${isArLang ? "د." : "Dr."} ${p.doctor?.fullName ?? "—"}</span>
            </div>
            ${meds.length ? `<ul class="med-list">${meds.map((m) => `<li>${m}</li>`).join("")}</ul>` : ""}
            ${p.diagnosis ? `<p class="notes">${isArLang ? "التشخيص: " : "Diagnosis: "}${p.diagnosis}</p>` : ""}
            ${payload.notes || p.notes ? `<p class="notes">${payload.notes || p.notes}</p>` : ""}
          </div>`;
      })
      .join("");

    const apptHTML = appointments
      .map(
        (a) => `
          <div class="visit-card ${a.status === "COMPLETED" ? "completed" : ""}">
            <div class="visit-header">
              <span class="visit-date">${new Date(a.startsAt).toLocaleDateString(numberLocale(locale))}</span>
              <span class="visit-status">${statusLabel(a.status, isArLang)}</span>
              <span class="visit-doctor">${isArLang ? "د." : "Dr."} ${a.doctor?.fullName ?? "—"}</span>
            </div>
            ${a.notes ? `<p class="notes">${a.notes}</p>` : ""}
          </div>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<title>${patient.fullName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ${isArLang ? "'Cairo', sans-serif" : "'Inter', sans-serif"};
    background: #fff; color: #1a2035; padding: 32px;
    font-size: 13px; line-height: 1.6;
  }

  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1565C0; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { display: flex; align-items: center; gap: 8px; }
  .logo-box { width: 36px; height: 36px; background: #1565C0; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .logo-cross { color: white; font-size: 22px; font-weight: bold; line-height: 1; }
  .logo-name { font-size: 16px; font-weight: 700; color: #1565C0; }
  .patient-info { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f0f4ff; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
  .info-item { }
  .info-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
  .info-value { font-size: 14px; font-weight: 600; color: #1a2035; margin-top: 2px; }
  .section-title { font-size: 13px; font-weight: 700; color: #1565C0; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
  .visit-card { background: #fafbff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
  .visit-card.completed { border-color: #bbf7d0; }
  .visit-header { display: flex; gap: 12px; align-items: center; margin-bottom: 6px; font-size: 12px; }
  .visit-date { font-weight: 600; color: #1565C0; }
  .visit-status { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 20px; font-size: 11px; }
  .visit-doctor { color: #555; }
  .med-list { padding-${isArLang ? "right" : "left"}: 18px; color: #333; font-size: 12px; }
  .med-list li { margin-bottom: 2px; }
  .notes { font-size: 12px; color: #555; margin-top: 6px; font-style: italic; }
  .print-date { font-size: 11px; color: #999; margin-top: 32px; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">
    <div class="logo-box"><span class="logo-cross">+</span></div>
    <span class="logo-name">${isArLang ? "نظام إدارة العيادة" : "Clinic CMS"}</span>
  </div>
  <div style="text-align:${isArLang ? "left" : "right"}">
    <div style="font-size:11px;color:#666">${isArLang ? "تاريخ الطباعة" : "Print Date"}</div>
    <div style="font-size:12px;font-weight:600">${new Date().toLocaleDateString(numberLocale(locale))}</div>
  </div>
</div>

<div class="patient-info">
  <div class="info-item">
    <div class="info-label">${isArLang ? "الاسم" : "Patient Name"}</div>
    <div class="info-value">${patient.fullName}</div>
  </div>
  ${patient.code ? `<div class="info-item"><div class="info-label">${isArLang ? "الكود" : "Code"}</div><div class="info-value">${patient.code}</div></div>` : ""}
  ${patient.phone ? `<div class="info-item"><div class="info-label">${isArLang ? "الهاتف" : "Phone"}</div><div class="info-value" dir="ltr">${patient.phone}</div></div>` : ""}
  ${age !== null ? `<div class="info-item"><div class="info-label">${isArLang ? "العمر" : "Age"}</div><div class="info-value">${formatNumber(age, locale)} ${isArLang ? "سنة" : "years"}</div></div>` : ""}
  <div class="info-item">
    <div class="info-label">${isArLang ? "عدد الزيارات" : "Total Visits"}</div>
    <div class="info-value">${formatNumber(appointments.length, locale)}</div>
  </div>
  <div class="info-item">
    <div class="info-label">${isArLang ? "الوصفات الطبية" : "Prescriptions"}</div>
    <div class="info-value">${formatNumber(prescriptions.length, locale)}</div>
  </div>
</div>

${
  patient.medicalNotes
    ? `
<div class="section-title">${isArLang ? "الملاحظات الطبية" : "Medical Notes"}</div>
<p style="font-size:13px;color:#333;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px">${patient.medicalNotes}</p>
`
    : ""
}

<div class="section-title">${isArLang ? "سجل الزيارات" : "Visit History"} (${appointments.length})</div>
${apptHTML || `<p style="color:#999;font-size:12px">${isArLang ? "لا توجد زيارات مسجلة" : "No visits recorded"}</p>`}

${
  prescriptions.length
    ? `
<div class="section-title">${isArLang ? "الوصفات الطبية" : "Prescriptions"} (${prescriptions.length})</div>
${medsHTML}
`
    : ""
}

<p class="print-date">${isArLang ? "تم الإنشاء بواسطة نظام إدارة العيادة" : "Generated by Clinic CMS"}</p>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 500);
  }

  async function uploadAttachment(file: File | null) {
    if (!file) return;
    setAttachmentError(null);
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as
        | Attachment
        | { message?: string };
      if (!res.ok || !("id" in data)) {
        setAttachmentError(
          "message" in data && data.message
            ? data.message
            : isAr
              ? "تعذر رفع الملف"
              : "Could not upload file",
        );
        return;
      }
      setAttachments((prev) => [data, ...prev]);
    } finally {
      setUploadingAttachment(false);
    }
  }

  const tabs = [
    {
      key: "timeline" as const,
      label: isAr
        ? `الزيارات (${appointments.length})`
        : `Visits (${appointments.length})`,
    },
    {
      key: "prescriptions" as const,
      label: isAr
        ? `الوصفات (${prescriptions.length})`
        : `Prescriptions (${prescriptions.length})`,
    },
    {
      key: "attachments" as const,
      label: isAr
        ? `الملفات (${attachments.length})`
        : `Files (${attachments.length})`,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Back + PDF */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href={`/${locale}/dashboard/doctor-admin/patients`}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {isAr ? "العودة للمرضى" : "Back to patients"}
        </Link>
        <button
          type="button"
          onClick={exportPDF}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-2 transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          {isAr ? "إصدار ملف" : "Generate File"}
        </button>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardBody>
          <div className="flex items-start gap-4 flex-wrap">
            {/* Avatar */}
            <div className="h-14 w-14 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {patient.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-foreground">
                  {patient.fullName}
                </h1>
                {patient.code && (
                  <span className="rounded-full bg-surface-2 border border-border px-2 py-0.5 text-xs font-mono text-muted">
                    #{patient.code}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted">
                {patient.phone && <span dir="ltr">{patient.phone}</span>}
                {age !== null && (
                  <span>
                    {formatNumber(age, locale)} {isAr ? "سنة" : "years old"}
                  </span>
                )}
                {patient.dateOfBirth && (
                  <span>
                    {new Date(patient.dateOfBirth).toLocaleDateString(
                      isAr ? "ar-EG" : "en-GB",
                    )}
                  </span>
                )}
              </div>
            </div>
            {/* Stats */}
            <div className="flex gap-3">
              {[
                {
                  label: isAr ? "زيارة" : "Visits",
                  val: appointments.length,
                  color: "text-primary",
                },
                {
                  label: isAr ? "مكتملة" : "Done",
                  val: completedVisits.length,
                  color: "text-success",
                },
                {
                  label: isAr ? "وصفة" : "Rx",
                  val: prescriptions.length,
                  color: "text-warning",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-card-border bg-surface-2/50 px-4 py-3 text-center"
                >
                  <p className={`text-2xl font-extrabold ${s.color}`}>
                    {formatNumber(s.val, locale)}
                  </p>
                  <p className="text-xs text-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {patient.medicalNotes && (
            <div className="mt-4 rounded-xl bg-warning/8 border border-warning/20 px-4 py-3">
              <p className="text-xs font-semibold text-warning mb-1">
                {isAr ? "📋 ملاحظات طبية" : "📋 Medical Notes"}
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {patient.medicalNotes}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <CardBody>
            <p className="text-xs font-semibold text-muted">
              {isAr ? "آخر زيارة" : "Last Visit"}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {lastVisit
                ? new Date(lastVisit.startsAt).toLocaleDateString(
                    isAr ? "ar-EG" : "en-GB",
                  )
                : isAr
                  ? "لا توجد زيارات"
                  : "No visits"}
            </p>
            {lastVisit && (
              <p className="mt-1 text-xs text-muted">
                {statusLabel(lastVisit.status, isAr)}
              </p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold text-muted">
              {isAr ? "آخر وصفة" : "Last Prescription"}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {lastPrescription
                ? new Date(lastPrescription.issuedAt).toLocaleDateString(
                    isAr ? "ar-EG" : "en-GB",
                  )
                : isAr
                  ? "لا توجد وصفات"
                  : "No prescriptions"}
            </p>
            {lastPrescription?.diagnosis && (
              <p className="mt-1 text-xs text-muted line-clamp-1">
                {lastPrescription.diagnosis}
              </p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold text-muted">
              {isAr ? "مؤشر سريع للدكتور" : "Doctor Snapshot"}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {isAr
                ? `${formatNumber(completedVisits.length, locale)} زيارة مكتملة من ${formatNumber(appointments.length, locale)}`
                : `${formatNumber(completedVisits.length, locale)} completed of ${formatNumber(appointments.length, locale)} visits`}
            </p>
            <p className="mt-1 text-xs text-muted">
              {recentMedications.length > 0
                ? recentMedications.slice(0, 2).join(" · ")
                : isAr
                  ? "لا توجد أدوية حديثة"
                  : "No recent medications"}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <div>
          {appointments.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              {isAr ? "لا توجد زيارات مسجلة" : "No visits recorded yet"}
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute start-5 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {appointments.map((appt, idx) => (
                  <div key={appt.id} className="flex gap-4 ps-12 relative">
                    {/* Dot */}
                    <div
                      className={`absolute start-[14px] top-4 h-3 w-3 rounded-full border-2 ${
                        appt.status === "COMPLETED"
                          ? "border-success bg-success/30"
                          : appt.status === "CANCELLED"
                            ? "border-danger bg-danger/30"
                            : "border-primary bg-primary/30"
                      }`}
                    />
                    {/* Number */}
                    <div className="absolute start-0 top-2.5 text-[10px] font-bold text-muted w-3.5 text-center">
                      {appointments.length - idx}
                    </div>
                    {/* Card */}
                    <div className="flex-1 rounded-xl border border-card-border bg-card px-4 py-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                            {new Date(appt.startsAt).toLocaleDateString(
                              isAr ? "ar-EG" : "en-GB",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                            </p>
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {visitTypeLabel(appt.visitType)}
                            </span>
                          </div>
                          <p className="text-xs text-muted mt-0.5">
                            {new Date(appt.startsAt).toLocaleTimeString(
                              isAr ? "ar-EG" : "en-GB",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                            {appt.doctor &&
                              ` · ${isAr ? "د." : "Dr."} ${appt.doctor.fullName}`}
                          </p>
                        </div>
                        <Badge variant={statusVariant(appt.status)}>
                          {statusLabel(appt.status, isAr)}
                        </Badge>
                      </div>
                      {appt.notes && (
                        <InfoBlock
                          title={isAr ? "ملاحظات الحجز" : "Booking notes"}
                          value={appt.notes}
                        />
                      )}
                      {prescriptionsForVisit(appt).length > 0 && (
                        <div className="mt-3 space-y-3 border-t border-card-border pt-3">
                          {prescriptionsForVisit(appt).map((p) => {
                                const payload = parsePrescriptionPayload(p.medications);
                                return (
                                  <div
                                    key={p.id}
                                    className="space-y-3 rounded-lg bg-surface-2/60 px-3 py-3"
                                  >
                                    {p.diagnosis && (
                                      <InfoBlock
                                        title={isAr ? "التشخيص" : "Diagnosis"}
                                        value={p.diagnosis}
                                        compact
                                      />
                                    )}
                                    {payload.medications.length > 0 && (
                                      <ListBlock
                                        title={isAr ? "الأدوية" : "Medications"}
                                        items={payload.medications}
                                      />
                                    )}
                                    {payload.tests.length > 0 && (
                                      <ListBlock
                                        title={isAr ? "التحاليل المطلوبة" : "Requested tests"}
                                        items={payload.tests}
                                      />
                                    )}
                                    {payload.imaging.length > 0 && (
                                      <ListBlock
                                        title={isAr ? "الأشعة المطلوبة" : "Requested imaging"}
                                        items={payload.imaging}
                                      />
                                    )}
                                    {(payload.notes || p.notes) && (
                                      <InfoBlock
                                        title={isAr ? "ملاحظات" : "Notes"}
                                        value={payload.notes || p.notes || ""}
                                        compact
                                      />
                                    )}
                                  </div>
                                );
                              })}
                        </div>
                      )}
                      {attachmentsForVisit(appt).length > 0 && (
                        <div className="mt-3 border-t border-card-border pt-3">
                          <p className="mb-2 text-xs font-semibold text-muted">
                            {isAr ? "ملفات الزيارة" : "Visit files"}
                          </p>
                          <FileGrid
                            files={attachmentsForVisit(appt)}
                            isAr={isAr}
                            onPreview={setPreviewFile}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prescriptions Tab */}
      {activeTab === "prescriptions" && (
        <div className="space-y-3">
          {prescriptions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              {isAr ? "لا توجد وصفات" : "No prescriptions recorded"}
            </div>
          ) : (
            prescriptions.map((p) => {
              const payload = parsePrescriptionPayload(p.medications);
              const meds = payload.medications;
              return (
                <Card key={p.id}>
                  <CardBody>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {new Date(p.issuedAt).toLocaleDateString(
                            isAr ? "ar-EG" : "en-GB",
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </p>
                        {p.doctor && (
                          <p className="text-xs text-muted mt-0.5">
                            {isAr ? "د." : "Dr."} {p.doctor.fullName}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
                        </svg>
                      </div>
                    </div>
                    {meds.length > 0 && (
                      <ul
                        className={`space-y-1 ${isAr ? "pe-4" : "ps-4"} list-disc`}
                      >
                        {meds.map((m, i) => (
                          <li key={i} className="text-sm text-foreground">
                            {m}
                          </li>
                        ))}
                      </ul>
                    )}
                    {p.diagnosis && (
                      <p className="mt-3 text-xs text-muted border-t border-card-border pt-2">
                        {isAr ? "التشخيص: " : "Diagnosis: "}
                        <span className="text-foreground">{p.diagnosis}</span>
                      </p>
                    )}
                    {(payload.notes || p.notes) && (
                      <p className="mt-3 text-xs text-muted italic border-t border-card-border pt-2">
                        {payload.notes || p.notes}
                      </p>
                    )}
                    {payload.tests.length > 0 && (
                      <div className="mt-3 border-t border-card-border pt-2">
                        <ListBlock title={isAr ? "التحاليل المطلوبة" : "Requested tests"} items={payload.tests} />
                      </div>
                    )}
                    {payload.imaging.length > 0 && (
                      <div className="mt-3 border-t border-card-border pt-2">
                        <ListBlock title={isAr ? "الأشعة المطلوبة" : "Requested imaging"} items={payload.imaging} />
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Attachments Tab */}
      {activeTab === "attachments" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-card-border bg-surface px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isAr ? "إضافة ملف للمريض" : "Add Patient File"}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {isAr
                  ? "ارفع صورة أشعة أو ملف PDF داخل ملف المريض."
                  : "Upload an X-ray image or PDF into the patient file."}
              </p>
              {attachmentError && (
                <p className="mt-1 text-xs text-danger">{attachmentError}</p>
              )}
            </div>
            <label className="shrink-0 inline-flex cursor-pointer items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
              {uploadingAttachment
                ? isAr
                  ? "جارٍ الرفع..."
                  : "Uploading..."
                : isAr
                  ? "رفع ملف"
                  : "Upload"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={uploadingAttachment}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void uploadAttachment(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {attachments.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              {isAr ? "لا توجد ملفات مرفقة" : "No attachments uploaded"}
            </div>
          ) : (
            <FileGrid files={attachments} isAr={isAr} onPreview={setPreviewFile} />
          )}
        </div>
      )}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg border border-card-border bg-card shadow-card-md">
            <div className="flex items-center justify-between gap-3 border-b border-card-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {previewFile.name}
                </p>
                <p className="text-xs text-muted">
                  {new Date(previewFile.uploadedAt).toLocaleDateString(
                    isAr ? "ar-EG" : "en-GB",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-2"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
            <div className="max-h-[78vh] overflow-auto bg-surface p-4">
              {isImage(previewFile) ? (
                <img
                  src={fileUrl(previewFile)}
                  alt={previewFile.name}
                  className="mx-auto max-h-[72vh] rounded object-contain"
                />
              ) : isPdf(previewFile) ? (
                <iframe
                  src={fileUrl(previewFile)}
                  title={previewFile.name}
                  className="h-[72vh] w-full rounded bg-white"
                />
              ) : (
                <a
                  href={fileUrl(previewFile)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  {isAr ? "فتح الملف" : "Open file"}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
