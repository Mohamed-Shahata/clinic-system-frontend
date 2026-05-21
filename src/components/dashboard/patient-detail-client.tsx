"use client";
// @ts-ignore
import { InstallmentsClient } from "@/components/dashboard/installments-client";
import { buildPrescriptionHTML } from "@/lib/prescription-templates";

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
  // extended fields — may be present depending on backend include
  labTests?: string | string[] | null;
  imaging?: string | string[] | null;
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
  medicalHistory?: {
    chronic: string[];
    allergies: string[];
    permanentMeds: string[];
    notes: string;
  } | null;
  createdAt: string;
  appointments?: Appointment[];
  prescriptions?: Prescription[];
  attachments?: Attachment[];
};

type PrescriptionTemplate = {
  id?: string;
  header?: {
    clinicName?: string;
    logoUrl?: string | null;
    address?: string;
    style?: string;
    [key: string]: unknown;
  };
  footer?: {
    phone?: string;
    [key: string]: unknown;
  };
};

interface Props {
  locale: string;
  patient: Patient;
  clinicLogo?: string | null;
  clinicNameEn?: string | null;
  template?: PrescriptionTemplate | null;
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
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value))
    return value.map(formatMedicationValue).filter(Boolean).join("، ");
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
      return parsed
        .map((m) =>
          typeof m === "string"
            ? m
            : [m.name, m.dose, m.frequency, m.duration, m.instructions, m.notes]
                .filter(Boolean)
                .map(formatMedicationValue)
                .join(" — "),
        )
        .filter(Boolean);
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
  // Always proxy through the Next.js /api/upload GET route.
  // The backend re-generates a fresh Cloudinary signed URL on every call,
  // so images never appear broken after the 5-minute Cloudinary expiry.
  const raw = file.url;
  if (!raw) return "";
  return `/api/upload?url=${encodeURIComponent(raw)}`;
}

function isImage(file: Attachment) {
  return (
    file.mimeType?.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif)$/i.test(file.name)
  );
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

export function PatientDetailClient({
  locale,
  patient,
  clinicLogo,
  clinicNameEn,
  template,
}: Props) {
  const isAr = locale === "ar";
  const [activeTab, setActiveTab] = useState<
    "timeline" | "prescriptions" | "attachments" | "installments"
  >("timeline");
  const [attachments, setAttachments] = useState(patient.attachments ?? []);
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
  const medicalHistory = patient.medicalHistory;
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
    return (labels[type ?? ""] ?? [isAr ? "زيارة" : "Visit", "Visit"])[
      isAr ? 0 : 1
    ];
  }

  function prescriptionsForVisit(appt: Appointment) {
    return prescriptions.filter(
      (p) => p.appointmentId === appt.id || sameDay(p.issuedAt, appt.startsAt),
    );
  }

  function attachmentsForVisit(appt: Appointment) {
    return attachments.filter(
      (a) =>
        a.appointmentId === appt.id || sameDay(a.uploadedAt, appt.startsAt),
    );
  }

  function exportPDF() {
    // Always English — use the buildPrescriptionHTML template system
    const prescriptionStyle =
      (template?.header as { style?: string } | undefined)?.style ?? "classic";

    // Collect all medications from all prescriptions
    const allMeds: string[] = [];
    const allLabs: string[] = [];
    const allImaging: string[] = [];
    let lastDiagnosis = "";
    let lastNotes = "";

    for (const p of prescriptions) {
      const payload = parsePrescriptionPayload(p.medications);
      allMeds.push(...payload.medications);
      if (p.labTests) {
        const labs = Array.isArray(p.labTests)
          ? (p.labTests as string[])
          : typeof p.labTests === "string"
            ? (p.labTests as string).split(",").map((s) => s.trim())
            : [];
        allLabs.push(...labs);
      }
      if (p.imaging) {
        const imgs = Array.isArray(p.imaging)
          ? (p.imaging as string[])
          : typeof p.imaging === "string"
            ? (p.imaging as string).split(",").map((s) => s.trim())
            : [];
        allImaging.push(...imgs);
      }
      if (p.diagnosis && !lastDiagnosis) lastDiagnosis = p.diagnosis;
      if ((payload.notes || p.notes) && !lastNotes)
        lastNotes = payload.notes || p.notes || "";
    }

    const ageNum = patient.dateOfBirth
      ? Math.floor(
          (Date.now() - new Date(patient.dateOfBirth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25),
        )
      : null;

    const html = buildPrescriptionHTML(
      {
        patient: {
          fullName: patient.fullName,
          code: patient.code,
          phone: patient.phone,
          age: ageNum,
        },
        doctor: {
          fullName:
            prescriptions[0]?.doctor?.fullName ??
            template?.header?.clinicName ??
            "—",
          specialty: undefined,
        },
        clinic: {
          name: clinicNameEn ?? template?.header?.clinicName ?? "Clinic",
          logoUrl: clinicLogo ?? template?.header?.logoUrl,
          address: template?.footer?.phone
            ? undefined
            : (template?.header as { address?: string } | undefined)?.address,
          phone: template?.footer?.phone,
        },
        diagnosis: lastDiagnosis || undefined,
        medications: [...new Set(allMeds)],
        labTests: allLabs.length ? [...new Set(allLabs)] : undefined,
        imaging: allImaging.length ? [...new Set(allImaging)] : undefined,
        notes: lastNotes || undefined,
        issuedAt: prescriptions[0]?.issuedAt ?? new Date().toISOString(),
      },
      prescriptionStyle as import("@/lib/prescription-templates").PrescriptionStyle,
    );

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 600);
  }

  function exportPatientReport() {
    const fmtD = (iso: string) =>
      new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

    const ageNum = patient.dateOfBirth
      ? Math.floor(
          (Date.now() - new Date(patient.dateOfBirth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25),
        )
      : null;

    const completedApts = appointments.filter((a) => a.status === "COMPLETED");
    const cancelledApts = appointments.filter((a) => a.status === "CANCELLED");

    // Diagnosis frequency
    const diagFreq: Record<string, number> = {};
    for (const p of prescriptions) {
      if (p.diagnosis) diagFreq[p.diagnosis] = (diagFreq[p.diagnosis] ?? 0) + 1;
    }
    const diagRows = Object.entries(diagFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(
        ([d, c]) =>
          `<tr><td>${d}</td><td style="text-align:center;font-weight:700">${c}x</td></tr>`,
      )
      .join("");

    // Med frequency
    const medFreq: Record<string, number> = {};
    for (const p of prescriptions) {
      const payload = parsePrescriptionPayload(p.medications);
      for (const m of payload.medications) {
        const name = m.split(" - ")[0].trim();
        medFreq[name] = (medFreq[name] ?? 0) + 1;
      }
    }
    const medRows = Object.entries(medFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(
        ([m, c]) =>
          `<tr><td>${m}</td><td style="text-align:center;font-weight:700">${c}x</td></tr>`,
      )
      .join("");

    // Lab tests
    const labSet = new Set<string>();
    const imgSet = new Set<string>();
    for (const p of prescriptions) {
      if (p.labTests) {
        const labs = Array.isArray(p.labTests)
          ? (p.labTests as string[])
          : String(p.labTests)
              .split(",")
              .map((s) => s.trim());
        labs.filter(Boolean).forEach((l) => labSet.add(l));
      }
      if (p.imaging) {
        const imgs = Array.isArray(p.imaging)
          ? (p.imaging as string[])
          : String(p.imaging)
              .split(",")
              .map((s) => s.trim());
        imgs.filter(Boolean).forEach((i) => imgSet.add(i));
      }
    }

    const clinicN = clinicNameEn ?? template?.header?.clinicName ?? "Clinic";
    const logoSrc = clinicLogo ?? template?.header?.logoUrl;

    const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<title>Patient Report — ${patient.fullName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#fff;color:#0f172a;font-size:13px;line-height:1.6;padding:36px 48px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #0f2856;margin-bottom:24px}
  .logo-row{display:flex;align-items:center;gap:12px}
  .logo-img{width:48px;height:48px;object-fit:contain;border-radius:8px}
  .logo-box{width:48px;height:48px;background:#0f2856;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:24px;font-weight:700}
  .clinic-name{font-size:18px;font-weight:700;color:#0f2856}
  .clinic-sub{font-size:11px;color:#64748b;margin-top:2px}
  .report-label{background:#0f2856;color:#fff;padding:8px 16px;border-radius:8px;font-size:11px;font-weight:700;text-align:center;letter-spacing:.06em}
  .patient-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;background:#f1f5f9;border-radius:12px;padding:16px;margin-bottom:24px}
  .kpi{text-align:center;padding:12px 8px;background:#fff;border-radius:10px;border:1px solid #e2e8f0}
  .kpi-val{font-size:22px;font-weight:700;color:#0f2856}
  .kpi-lbl{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-top:3px}
  .section{margin-bottom:22px}
  h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#0f2856;padding:6px 10px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 6px 6px 0;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#f8fafc;color:#475569;font-size:10px;text-transform:uppercase;letter-spacing:.05em;padding:7px 12px;border-bottom:2px solid #e2e8f0;text-align:left}
  td{padding:7px 12px;border-bottom:1px solid #f1f5f9;color:#1e293b}
  tr:nth-child(even) td{background:#fafbff}
  .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600}
  .badge-done{background:#d1fae5;color:#065f46}
  .badge-cancel{background:#fee2e2;color:#991b1b}
  .badge-pending{background:#fef3c7;color:#92400e}
  .timeline{border-left:2px solid #e2e8f0;margin-left:8px;padding-left:16px}
  .tl-item{position:relative;margin-bottom:10px;padding:8px 12px;background:#fafbff;border:1px solid #e2e8f0;border-radius:8px}
  .tl-dot{position:absolute;left:-23px;top:12px;width:10px;height:10px;border-radius:50%;background:#2563eb;border:2px solid #fff}
  .chips{display:flex;flex-wrap:wrap;gap:6px}
  .chip{padding:3px 10px;background:#eff6ff;border:1px solid #c7d7f7;border-radius:20px;font-size:11px;color:#1e40af}
  .footer{margin-top:32px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}
  @media print{body{padding:24px}}
</style>
</head>
<body>

<div class="header">
  <div class="logo-row">
    ${logoSrc ? `<img class="logo-img" src="${logoSrc}" alt="logo">` : `<div class="logo-box">+</div>`}
    <div>
      <div class="clinic-name">${clinicN}</div>
      <div class="clinic-sub">Patient Medical Report</div>
    </div>
  </div>
  <div>
    <div class="report-label">PATIENT REPORT</div>
    <div style="text-align:right;font-size:10px;color:#64748b;margin-top:6px">${fmtD(new Date().toISOString())}</div>
  </div>
</div>

<!-- KPI cards -->
<div class="patient-grid">
  <div class="kpi"><div class="kpi-val">${appointments.length}</div><div class="kpi-lbl">Total Visits</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#10b981">${completedApts.length}</div><div class="kpi-lbl">Completed</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#f59e0b">${prescriptions.length}</div><div class="kpi-lbl">Prescriptions</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#6366f1">${cancelledApts.length}</div><div class="kpi-lbl">Cancelled</div></div>
</div>

<!-- Patient info -->
<div class="section">
  <h3>Patient Information</h3>
  <table>
    <tr><th style="width:40%">Field</th><th>Details</th></tr>
    <tr><td>Full Name</td><td><b>${patient.fullName}</b></td></tr>
    ${patient.code ? `<tr><td>Patient Code</td><td style="font-family:monospace">${patient.code}</td></tr>` : ""}
    ${ageNum !== null ? `<tr><td>Age</td><td>${ageNum} years old</td></tr>` : ""}
    ${patient.phone ? `<tr><td>Phone</td><td dir="ltr">${patient.phone}</td></tr>` : ""}
    ${patient.dateOfBirth ? `<tr><td>Date of Birth</td><td>${fmtD(patient.dateOfBirth)}</td></tr>` : ""}
    ${patient.medicalNotes ? `<tr><td>Medical Notes</td><td style="color:#b45309;font-style:italic">${patient.medicalNotes}</td></tr>` : ""}
  </table>
</div>

${
  diagRows
    ? `
<div class="section">
  <h3>Diagnosis History (Most Frequent)</h3>
  <table>
    <tr><th>Diagnosis</th><th style="text-align:center">Occurrences</th></tr>
    ${diagRows}
  </table>
</div>`
    : ""
}

${
  medRows
    ? `
<div class="section">
  <h3>Medications Summary</h3>
  <table>
    <tr><th>Medication</th><th style="text-align:center">Prescribed</th></tr>
    ${medRows}
  </table>
</div>`
    : ""
}

${
  labSet.size > 0
    ? `
<div class="section">
  <h3>Lab Tests Ordered</h3>
  <div class="chips">${[...labSet].map((l) => `<span class="chip">🔬 ${l}</span>`).join("")}</div>
</div>`
    : ""
}

${
  imgSet.size > 0
    ? `
<div class="section">
  <h3>Imaging Ordered</h3>
  <div class="chips">${[...imgSet].map((i) => `<span class="chip">📷 ${i}</span>`).join("")}</div>
</div>`
    : ""
}

<!-- Visit Timeline (last 10) -->
${
  appointments.length > 0
    ? `
<div class="section">
  <h3>Visit Timeline (Latest ${Math.min(appointments.length, 10)})</h3>
  <div class="timeline">
    ${appointments
      .slice(0, 10)
      .map((a) => {
        const badgeClass =
          a.status === "COMPLETED"
            ? "badge-done"
            : a.status === "CANCELLED"
              ? "badge-cancel"
              : "badge-pending";
        const statusTxt =
          a.status === "COMPLETED"
            ? "Completed"
            : a.status === "CANCELLED"
              ? "Cancelled"
              : a.status.replace("_", " ");
        return `<div class="tl-item">
        <div class="tl-dot"></div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;font-weight:600">${fmtD(a.startsAt)}</span>
          <span class="badge ${badgeClass}">${statusTxt}</span>
        </div>
        ${a.doctor?.fullName ? `<div style="font-size:11px;color:#64748b;margin-top:3px">Dr. ${a.doctor.fullName}</div>` : ""}
        ${a.notes ? `<div style="font-size:11px;color:#475569;margin-top:4px;font-style:italic">${a.notes}</div>` : ""}
      </div>`;
      })
      .join("")}
  </div>
</div>`
    : ""
}

<div class="footer">
  <div>Generated by Clinic Management System · ${fmtD(new Date().toISOString())} · Confidential</div>
  <div>Dr. _______________________ Signature</div>
</div>

</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
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
    {
      key: "installments" as const,
      label: isAr ? "التقسيط" : "Installments",
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
        <button
          type="button"
          onClick={exportPatientReport}
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
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          {isAr ? "تقرير المريض" : "Patient Report"}
        </button>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardBody>
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-lg sm:text-xl font-bold text-primary">
              {patient.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                  {patient.fullName}
                </h1>
                {patient.code && (
                  <span className="rounded-full bg-surface-2 border border-border px-2 py-0.5 text-xs font-mono text-muted">
                    {patient.code}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted">
                {patient.phone && <span dir="ltr">{patient.phone}</span>}
                {age !== null && (
                  <span>
                    {formatNumber(age, locale)} {isAr ? "سنة" : "y/o"}
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
          </div>
          {/* Stats row */}
          <div className="mt-3 flex gap-2 border-t border-border pt-3">
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
                className="flex-1 rounded-xl border border-card-border bg-surface-2/50 px-2 py-2 sm:px-4 sm:py-3 text-center"
              >
                <p className={`text-xl sm:text-2xl font-extrabold ${s.color}`}>
                  {formatNumber(s.val, locale)}
                </p>
                <p className="text-xs text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {medicalHistory &&
            (medicalHistory.chronic.length > 0 ||
              medicalHistory.allergies.length > 0 ||
              medicalHistory.permanentMeds.length > 0 ||
              medicalHistory.notes) && (
              <div className="mt-4 grid gap-3 rounded-xl bg-warning/8 border border-warning/20 px-4 py-3 sm:grid-cols-2">
                {/* FIX: Prefer structured medical history while preserving legacy notes fallback. */}
                <ListBlock
                  title={isAr ? "أمراض مزمنة" : "Chronic"}
                  items={medicalHistory.chronic}
                />
                <ListBlock
                  title={isAr ? "حساسية" : "Allergies"}
                  items={medicalHistory.allergies}
                />
                <ListBlock
                  title={isAr ? "أدوية دائمة" : "Permanent meds"}
                  items={medicalHistory.permanentMeds}
                />
                {medicalHistory.notes && (
                  <InfoBlock
                    title={isAr ? "ملاحظات" : "Notes"}
                    value={medicalHistory.notes}
                    compact
                  />
                )}
              </div>
            )}

          {!medicalHistory && patient.medicalNotes && (
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                            const payload = parsePrescriptionPayload(
                              p.medications,
                            );
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
                                    title={
                                      isAr
                                        ? "التحاليل المطلوبة"
                                        : "Requested tests"
                                    }
                                    items={payload.tests}
                                  />
                                )}
                                {payload.imaging.length > 0 && (
                                  <ListBlock
                                    title={
                                      isAr
                                        ? "الأشعة المطلوبة"
                                        : "Requested imaging"
                                    }
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
                        <ListBlock
                          title={isAr ? "التحاليل المطلوبة" : "Requested tests"}
                          items={payload.tests}
                        />
                      </div>
                    )}
                    {payload.imaging.length > 0 && (
                      <div className="mt-3 border-t border-card-border pt-2">
                        <ListBlock
                          title={isAr ? "الأشعة المطلوبة" : "Requested imaging"}
                          items={payload.imaging}
                        />
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Installments Tab */}
      {activeTab === "installments" && (
        <div className="py-2">
          <InstallmentsClient
            patientId={patient.id}
            patientName={patient.fullName}
            showCreate={true}
          />
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
            <FileGrid
              files={attachments}
              isAr={isAr}
              onPreview={setPreviewFile}
            />
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
