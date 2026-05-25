"use client";

import { buildPrescriptionPDF } from "@/lib/prescription-pdf";
import type { PrescriptionLang } from "@/lib/prescription-pdf";
import { InstallmentsClient } from "@/components/dashboard/installments-client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
} from "@/components/ui";

/* ── Types ── */
type QueuePatient = {
  id: string;
  code: string;
  fullName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  medicalNotes?: string | null;
};

type QueueItem = {
  id: string;
  startsAt: string;
  status: string;
  visitType?: string | null;
  notes?: string | null;
  patient: QueuePatient;
  doctor: { id: string; fullName: string };
};

type PatientAttachment = {
  id: string;
  appointmentId?: string | null;
  name: string;
  url: string;
  mimeType?: string;
  uploadedAt: string;
};

type MedicationRow = {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  notes: string;
};

type CatalogMedication = {
  name: string;
  dose?: string;
  frequency?: string;
};

type Template = {
  header?: {
    clinicName?: string;
    logoUrl?: string | null;
    address?: string;
    style?: string; // "classic" | "modern" | "minimal"
  };
  footer?: { phone?: string; workingHours?: string; notes?: string };
};

type UploadPreview = {
  file: File;
  url: string | null;
  error?: string;
};

const emptyMedication = (): MedicationRow => ({
  name: "",
  dose: "",
  frequency: "",
  duration: "",
  notes: "",
});

/* ── CatalogSelect: searchable dropdown from catalog ── */
function CatalogSelect({
  value,
  onChange,
  options,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative">
      {label && (
        <label className="block text-xs font-medium text-foreground mb-1">
          {label}
        </label>
      )}
      <input
        type="text"
        value={search}
        placeholder={placeholder}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // FRONT-07: The 150ms setTimeout is a race condition on slow devices — if the user
        // clicks an option and the device is slow, the dropdown closes before onClick fires.
        // Fix: use onMouseDown on list items (fires before onBlur) to select before close.
        onBlur={() => setOpen(false)}
        className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary/30 transition-shadow focus:ring-2"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded border border-border bg-card shadow-lg">
          {filtered.slice(0, 20).map((opt) => (
            <li
              key={opt}
              onMouseDown={() => {
                onChange(opt);
                setSearch(opt);
                setOpen(false);
              }}
              className="cursor-pointer px-3 py-2 text-sm text-foreground hover:bg-surface-2"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function calcAge(dateOfBirth?: string | null): string | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return String(age);
}

/* ── Status badge colours ── */
function statusBadge(status: string, isAr: boolean) {
  const map: Record<
    string,
    {
      className: string;
      dot: string;
      label: string;
      labelAr: string;
    }
  > = {
    IN_QUEUE: {
      className: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
      dot: "bg-blue-400",
      label: "Waiting",
      labelAr: "انتظار",
    },
    IN_PROGRESS: {
      className: "bg-primary/10 text-primary border border-primary/25",
      dot: "bg-primary animate-pulse",
      label: "In Progress",
      labelAr: "قيد التنفيذ",
    },
    COMPLETED: {
      className: "bg-success/10 text-success border border-success/20",
      dot: "bg-success",
      label: "Completed",
      labelAr: "مكتمل",
    },
    CANCELLED: {
      className: "bg-surface-2 text-muted border border-border",
      dot: "bg-muted",
      label: "Cancelled",
      labelAr: "ملغي",
    },
  };
  const entry = map[status] ?? {
    className: "bg-surface-2 text-muted border border-border",
    dot: "bg-muted",
    label: status,
    labelAr: status,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${entry.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${entry.dot}`} />
      {isAr ? entry.labelAr : entry.label}
    </span>
  );
}

/* ── Main Component ── */
export function WorkspaceClientPage({
  locale,
  initialQueue,
  catalogMedications,
  catalogImaging,
  template,
  doctorInfo,
}: {
  locale: string;
  initialQueue: QueueItem[];
  catalogMedications: CatalogMedication[];
  catalogImaging: Array<{ name: string }>;
  template: Template | null;
  doctorInfo: { id: string; fullName: string; specialty: string | null };
}) {
  const isAr = locale === "ar";
  const { addToast } = useToast();

  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  // Auto-restore IN_PROGRESS patient on mount (handles page refresh/navigation)
  const [activeItem, setActiveItem] = useState<QueueItem | null>(
    () => initialQueue.find((q) => q.status === "IN_PROGRESS") ?? null,
  );
  // On mount: if there's a draft for the current active patient, it's already
  // loaded above via loadDraft(). If the draft's appointmentId doesn't match
  // the current activeItem (e.g. a different visit), clear the stale draft.
  useEffect(() => {
    const draft = loadDraft();
    if (draft && activeItem && draft.appointmentId !== activeItem.id) {
      try {
        sessionStorage.removeItem(`workspace-draft-${doctorInfo.id}`);
      } catch {
        /* ignore */
      }
      setDiagnosis("");
      setNotes("");
      setRequestedTests([""]);
      setRequestedImaging([""]);
      setRows([emptyMedication()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [loadingStart, setLoadingStart] = useState<string | null>(null);
  const [loadingEnd, setLoadingEnd] = useState(false);
  const [savingSystem, setSavingSystem] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadPreview[]>([]);
  const uploadFilesRef = useRef<UploadPreview[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [patientAttachments, setPatientAttachments] = useState<
    PatientAttachment[]
  >([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [previewAttachment, setPreviewAttachment] =
    useState<PatientAttachment | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedPrescriptionId, setLastSavedPrescriptionId] = useState<
    string | null
  >(null);
  const [rxLang, setRxLang] = useState<PrescriptionLang>(
    locale === "ar" ? "ar" : "en",
  );

  /* ── Prescription form state (draft restored from sessionStorage on mount) ── */
  const DRAFT_KEY = `workspace-draft-${doctorInfo.id}`;

  function loadDraft() {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as {
        appointmentId: string;
        diagnosis: string;
        notes: string;
        requestedTests: string[];
        requestedImaging: string[];
        rows: MedicationRow[];
      };
    } catch {
      return null;
    }
  }

  const _draft = loadDraft();
  const [diagnosis, setDiagnosis] = useState(_draft?.diagnosis ?? "");
  const [notes, setNotes] = useState(_draft?.notes ?? "");
  const [requestedTests, setRequestedTests] = useState<string[]>(
    _draft?.requestedTests ?? [""],
  );
  const [requestedImaging, setRequestedImaging] = useState<string[]>(
    _draft?.requestedImaging ?? [""],
  );
  const [rows, setRows] = useState<MedicationRow[]>(
    _draft?.rows ?? [emptyMedication()],
  );

  /* ── Catalog tests (fetched client-side since backend has no tests catalog yet) ── */
  const [catalogTests, setCatalogTests] = useState<string[]>([]);
  useEffect(() => {
    void fetch("/api/prescriptions/catalog/tests")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: unknown) =>
        Array.isArray(d)
          ? setCatalogTests((d as Array<{ name: string }>).map((x) => x.name))
          : null,
      )
      .catch(() => null);
  }, []);

  /* ── Autosave draft to sessionStorage on every form change ── */
  useEffect(() => {
    if (!activeItem) return;
    try {
      sessionStorage.setItem(
        `workspace-draft-${doctorInfo.id}`,
        JSON.stringify({
          appointmentId: activeItem.id,
          diagnosis,
          notes,
          requestedTests,
          requestedImaging,
          rows,
        }),
      );
    } catch {
      /* storage quota exceeded or private mode — silent */
    }
  }, [
    activeItem,
    diagnosis,
    notes,
    requestedTests,
    requestedImaging,
    rows,
    doctorInfo.id,
  ]);

  /* ── Labels ── */
  const L = {
    pageTitle: isAr ? "مساحة العمل" : "Workspace",
    waitingQueue: isAr ? "قائمة الانتظار" : "Waiting Queue",
    noQueue: isAr ? "لا يوجد مرضى في الانتظار" : "No patients in queue",
    startVisit: isAr ? "ابدأ الكشف" : "Start Visit",
    active: isAr ? "قيد التنفيذ" : "Active",
    encounterTitle: isAr ? "بيانات الكشف" : "Clinical Encounter",
    diagnosis: isAr ? "التشخيص" : "Diagnosis",
    notesLabel: isAr ? "ملاحظات" : "Notes",
    tests: isAr ? "التحاليل المطلوبة" : "Requested Tests",
    imaging: isAr ? "الأشعة المطلوبة" : "Requested Imaging",
    medications: isAr ? "الأدوية" : "Medications",
    medicine: isAr ? "اسم الدواء" : "Medication",
    dose: isAr ? "الجرعة" : "Dose",
    frequency: isAr ? "التكرار" : "Frequency",
    add: isAr ? "إضافة" : "Add",
    remove: isAr ? "حذف" : "Remove",
    saveSystem: isAr ? "حفظ في السيستم" : "Save to System",
    printRx: isAr ? "طباعة الروشتة" : "Print Prescription",
    endVisit: isAr ? "إنهاء الكشف" : "End Visit",
    savedOk: isAr ? "تم الحفظ بنجاح." : "Saved successfully.",
    optionalFile: isAr ? "ملف اختياري" : "Optional file",
    optionalFileHint: isAr
      ? "ارفع صور أو PDF لحفظها في ملف المريض."
      : "Upload images or PDFs to store with the patient.",
    chooseFiles: isAr ? "اختيار ملفات" : "Choose files",
    removeFile: isAr ? "حذف الملف" : "Remove file",
    invalidFile: isAr
      ? "مسموح بالصور أو PDF فقط، وبحد أقصى 10MB لكل ملف."
      : "Only images or PDFs are allowed, up to 10MB per file.",
    age: isAr ? "العمر" : "Age",
    years: isAr ? "سنة" : "yrs",
    code: isAr ? "الكود" : "Code",
    phone: isAr ? "الهاتف" : "Phone",
    visitType: isAr ? "نوع الزيارة" : "Visit Type",
    medNotes: isAr ? "ملاحظات طبية" : "Medical Notes",
    refreshQueue: isAr ? "تحديث القائمة" : "Refresh Queue",
    queueOrder: isAr ? "الترتيب" : "#",
  };

  const hasValidUploadFiles = useMemo(
    () => uploadFiles.some((item) => !item.error),
    [uploadFiles],
  );

  useEffect(() => {
    uploadFilesRef.current = uploadFiles;
  }, [uploadFiles]);

  useEffect(() => {
    return () => {
      uploadFilesRef.current.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, []);

  const MAX_UPLOAD_FILES = 5;

  function validateUploadFile(file: File) {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];
    return allowed.includes(file.type) && file.size <= 10 * 1024 * 1024;
  }

  function handleUploadFiles(files: FileList | null) {
    if (!files) return;
    const fileArray = Array.from(files);
    // Build previews OUTSIDE setState to avoid double-invocation in StrictMode
    const previews: UploadPreview[] = fileArray.map((file) => {
      const valid = validateUploadFile(file);
      return {
        file,
        url:
          valid && file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : null,
        error: valid ? undefined : L.invalidFile,
      };
    });
    setUploadFiles((prev) => {
      const remaining = MAX_UPLOAD_FILES - prev.length;
      if (remaining <= 0) {
        // Revoke any object URLs we just created since we won't use them
        previews.forEach((p) => {
          if (p.url) URL.revokeObjectURL(p.url);
        });
        return prev;
      }
      return [...prev, ...previews.slice(0, remaining)];
    });
  }

  function removeUploadFile(index: number) {
    setUploadFiles((prev) => {
      const item = prev[index];
      if (item?.url) URL.revokeObjectURL(item.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  /* ── Reset form when switching patient ── */
  function resetForm() {
    setDiagnosis("");
    setNotes("");
    setRequestedTests([""]);
    setRequestedImaging([""]);
    setRows([emptyMedication()]);
    setSavedAt(null);
    setSaveError(null);
    setLastSavedPrescriptionId(null);
    setUploadFiles([]);
    setPatientAttachments([]);
    setPreviewAttachment(null);
    // Clear draft so stale data doesn't restore on the next patient
    try {
      sessionStorage.removeItem(`workspace-draft-${doctorInfo.id}`);
    } catch {
      /* ignore */
    }
  }

  /* ── Fetch existing patient attachments ── */
  const fetchPatientAttachments = useCallback(async (patientId: string) => {
    setLoadingAttachments(true);
    try {
      const res = await fetch(`/api/patients/${patientId}`);
      if (res.ok) {
        const data = (await res.json()) as {
          attachments?: PatientAttachment[];
        };
        setPatientAttachments(data.attachments ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoadingAttachments(false);
    }
  }, []);

  /* ── Upload files independently (no prescription required) ── */
  const uploadFilesNow = useCallback(
    async (patientId: string, appointmentId: string) => {
      const validFiles = uploadFilesRef.current.filter((entry) => !entry.error);
      if (!validFiles.length) return;
      setUploadingFile(true);
      let uploadedCount = 0;
      let failedCount = 0;
      for (const item of validFiles) {
        try {
          const formData = new FormData();
          formData.append("file", item.file);
          const res = await fetch(
            `/api/patients/${patientId}?appointmentId=${appointmentId}`,
            { method: "POST", body: formData },
          );
          if (res.ok) {
            uploadedCount++;
          } else {
            const errData = (await res.json().catch(() => ({}))) as {
              message?: string;
            };
            if (
              errData.message?.includes("Max 5") ||
              errData.message?.includes("5 files")
            ) {
              addToast(
                "error",
                isAr
                  ? "وصلت للحد الأقصى (5 ملفات للمريض)"
                  : "Max 5 files per patient reached",
              );
              break;
            }
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }
      setUploadingFile(false);
      if (uploadedCount > 0) {
        setUploadFiles([]);
        addToast(
          "success",
          isAr
            ? `تم رفع ${uploadedCount} ملف بنجاح`
            : `${uploadedCount} file(s) uploaded`,
        );
        void fetchPatientAttachments(patientId);
      }
      if (failedCount > 0) {
        addToast(
          "error",
          isAr ? `فشل رفع ${failedCount} ملف` : `${failedCount} file(s) failed`,
        );
      }
    },
    [isAr, addToast, fetchPatientAttachments],
  );

  /* ── Refresh queue from API ── */
  const refreshQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/appointments/queue");
      if (res.ok) {
        const data = (await res.json()) as QueueItem[];
        setQueue(data);
        // Update active item if it changed
        if (activeItem) {
          const updated = data.find((d) => d.id === activeItem.id);
          if (updated) setActiveItem(updated);
        }
      }
    } catch {
      /* silent */
    }
  }, [activeItem]);

  // Auto-refresh every 30s — FRONT-03: pause when tab is not visible to save bandwidth
  useEffect(() => {
    let cancelled = false;
    let failCount = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      if (document.visibilityState === "visible") {
        try {
          await refreshQueue();
          failCount = 0;
        } catch {
          failCount = Math.min(failCount + 1, 4);
        }
      }
      if (!cancelled) {
        timer = setTimeout(tick, 30_000 * Math.pow(2, failCount));
      }
    }

    timer = setTimeout(tick, 30_000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [refreshQueue]);

  /* ── Start visit (IN_QUEUE → IN_PROGRESS) ── */
  async function startVisit(item: QueueItem) {
    setLoadingStart(item.id);
    try {
      const res = await fetch(`/api/appointments/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
      if (!res.ok) throw new Error("failed");
      const updated: QueueItem = { ...item, status: "IN_PROGRESS" };
      setQueue((prev) => prev.map((q) => (q.id === item.id ? updated : q)));
      resetForm();
      setActiveItem(updated);
      void fetchPatientAttachments(item.patient.id);
      addToast("success", isAr ? "تم بدء الكشف" : "Visit started");
    } catch {
      addToast("error", isAr ? "حدث خطأ" : "Something went wrong");
    } finally {
      setLoadingStart(null);
    }
  }

  /* ── Save prescription ── */
  async function savePrescription(isDraft: boolean) {
    if (!activeItem) return;
    setSaveError(null);
    setSavingSystem(true);
    try {
      const meds = rows
        .map((r) => ({
          name: r.name.trim(),
          dose: r.dose.trim(),
          frequency: r.frequency.trim(),
        }))
        .filter((r) => r.name);

      const body = {
        patientId: activeItem.patient.id,
        appointmentId: activeItem.id,
        diagnosis: diagnosis.trim() || undefined,
        notes: notes.trim() || undefined,
        medications: meds,
        requestedTests: requestedTests.map((t) => t.trim()).filter(Boolean),
        requestedImaging: requestedImaging.map((i) => i.trim()).filter(Boolean),
      };

      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setSaveError(err.message ?? (isAr ? "تعذر الحفظ" : "Could not save"));
        return;
      }
      const saved = (await res.json()) as { id?: string };
      setSavedAt(new Date().toISOString());
      if (saved?.id) setLastSavedPrescriptionId(saved.id);
      // Reuse uploadFilesNow — handles toasts, URL revocation, and fetchPatientAttachments
      if (hasValidUploadFiles) {
        await uploadFilesNow(activeItem.patient.id, activeItem.id);
      }
      addToast("success", L.savedOk);
    } catch {
      setSaveError(isAr ? "حدث خطأ" : "Something went wrong");
    } finally {
      setSavingSystem(false);
      setUploadingFile(false);
    }
  }

  /* ── Print prescription ── */
  function printPrescription() {
    if (!activeItem) return;
    if (!lastSavedPrescriptionId) {
      addToast(
        "error",
        isAr ? "احفظ الروشتة أولاً" : "Save the prescription first",
      );
      return;
    }

    const ageNum = activeItem.patient.dateOfBirth
      ? Math.floor(
          (Date.now() - new Date(activeItem.patient.dateOfBirth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25),
        )
      : null;

    const meds = rows
      .filter((row) => row.name.trim())
      .map((row) => ({
        name: row.name,
        dose: row.dose || undefined,
        frequency: row.frequency || undefined,
        duration: row.duration || undefined,
        notes: row.notes || undefined,
      }));

    const html = buildPrescriptionPDF(
      {
        patient: {
          fullName: activeItem.patient.fullName,
          code: activeItem.patient.code,
          phone: activeItem.patient.phone,
          age: ageNum,
        },
        doctor: {
          fullName: doctorInfo.fullName,
          specialty: doctorInfo.specialty ?? undefined,
        },
        clinic: {
          name: template?.header?.clinicName ?? "",
          logoUrl: template?.header?.logoUrl ?? null,
          address: template?.header?.address ?? null,
          phone: template?.footer?.phone ?? null,
        },
        diagnosis: diagnosis || undefined,
        medications: meds,
        labTests: requestedTests.filter(Boolean).length
          ? requestedTests.filter(Boolean)
          : undefined,
        imaging: requestedImaging.filter(Boolean).length
          ? requestedImaging.filter(Boolean)
          : undefined,
        notes: notes || undefined,
        issuedAt: new Date().toISOString(),
      },
      rxLang,
    );

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    // Wait for fonts to load before triggering print
    setTimeout(() => win.print(), 1200);
  }

  /* ── End visit (IN_PROGRESS → COMPLETED) ── */
  async function endVisit() {
    if (!activeItem) return;
    setLoadingEnd(true);
    try {
      const res = await fetch(`/api/appointments/${activeItem.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!res.ok) throw new Error("failed");
      setQueue((prev) =>
        prev.map((q) =>
          q.id === activeItem.id ? { ...q, status: "COMPLETED" } : q,
        ),
      );
      setActiveItem(null);
      resetForm();
      addToast("success", isAr ? "تم إنهاء الكشف" : "Visit completed");
      void refreshQueue();
    } catch {
      addToast("error", isAr ? "حدث خطأ" : "Something went wrong");
    } finally {
      setLoadingEnd(false);
    }
  }

  /* ── Medication helpers ── */
  function updateRow(index: number, patch: Partial<MedicationRow>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }
  function applyMedication(index: number, name: string) {
    const match = catalogMedications.find((m) => m.name === name);
    updateRow(index, {
      name,
      dose: match
        ? [match.dose, match.frequency].filter(Boolean).join(" - ")
        : (rows[index]?.dose ?? ""),
      frequency: match?.frequency ?? rows[index]?.frequency ?? "",
    });
  }

  /* ── Waiting queue (exclude IN_PROGRESS) ── */
  const waitingQueue = queue.filter(
    (q) =>
      q.status !== "IN_PROGRESS" &&
      q.status !== "COMPLETED" &&
      q.status !== "CANCELLED",
  );
  const inProgressItem = queue.find((q) => q.status === "IN_PROGRESS");

  /* ── Render ── */
  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {L.pageTitle}
            </h1>
            <p className="text-sm text-muted">
              {isAr
                ? "إدارة المرضى وكتابة الروشتة"
                : "Manage patients and write prescriptions"}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refreshQueue()}
          >
            {L.refreshQueue}
          </Button>
        </div>

        {waitingQueue.length > 0 && (
          <div className="lg:hidden overflow-x-auto pb-1">
            <div className="flex w-max gap-2">
              {waitingQueue.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!inProgressItem) void startVisit(item);
                  }}
                  className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground whitespace-nowrap"
                >
                  {item.patient.fullName}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          {/* ── LEFT: Queue Panel ── */}
          <div className="hidden lg:flex flex-col gap-4">
            {/* Active patient card */}
            {inProgressItem && (
              <Card className="border-warning/40 bg-warning/5">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {L.active}
                    </span>
                    {statusBadge("IN_PROGRESS", isAr)}
                  </div>
                </CardHeader>
                <CardBody>
                  <p className="font-medium text-foreground">
                    {inProgressItem.patient.fullName}
                  </p>
                  <p className="text-xs text-muted font-mono">
                    {inProgressItem.patient.code}
                  </p>
                </CardBody>
              </Card>
            )}

            {/* Waiting queue */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">
                    {L.waitingQueue}
                  </h2>
                  <Badge variant="muted">{waitingQueue.length}</Badge>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                {waitingQueue.length === 0 ? (
                  <div className="px-4 py-8">
                    <EmptyState
                      title={L.noQueue}
                      description={
                        isAr
                          ? "لا يوجد مرضى في قائمة الانتظار حالياً"
                          : "No patients waiting right now"
                      }
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {waitingQueue.map((item, index) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2/50 transition-colors"
                      >
                        {/* Order number */}
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {item.patient.fullName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted font-mono">
                              {item.patient.code}
                            </p>
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                              {isAr ? "انتظار" : "Waiting"}
                            </span>
                          </div>
                        </div>
                        {/* Only allow starting if no active patient */}
                        {!inProgressItem && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={loadingStart === item.id}
                            onClick={() => void startVisit(item)}
                          >
                            {L.startVisit}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          {/* ── RIGHT: Encounter Panel ── */}
          {activeItem ? (
            <div className="flex flex-col gap-4">
              {/* Patient info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                        {activeItem.patient.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {activeItem.patient.fullName}
                        </p>
                        <p className="text-xs text-muted font-mono">
                          {activeItem.patient.code}
                        </p>
                      </div>
                    </div>
                    {statusBadge(activeItem.status, isAr)}
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
                    {activeItem.patient.phone && (
                      <div>
                        <p className="text-xs text-muted mb-0.5">{L.phone}</p>
                        <p className="font-medium text-foreground font-mono">
                          {activeItem.patient.phone}
                        </p>
                      </div>
                    )}
                    {activeItem.patient.dateOfBirth && (
                      <div>
                        <p className="text-xs text-muted mb-0.5">{L.age}</p>
                        <p className="font-medium text-foreground">
                          {calcAge(activeItem.patient.dateOfBirth)} {L.years}
                        </p>
                      </div>
                    )}
                    {activeItem.visitType && (
                      <div>
                        <p className="text-xs text-muted mb-0.5">
                          {L.visitType}
                        </p>
                        <p className="font-medium text-foreground">
                          {activeItem.visitType === "NEW_VISIT"
                            ? isAr
                              ? "زيارة جديدة"
                              : "New Visit"
                            : isAr
                              ? "متابعة"
                              : "Follow-up"}
                        </p>
                      </div>
                    )}
                    {activeItem.notes && (
                      <div className="col-span-2 sm:col-span-4">
                        <p className="text-xs text-muted mb-0.5">
                          {isAr ? "ملاحظات الحجز" : "Booking Notes"}
                        </p>
                        <p className="text-foreground">{activeItem.notes}</p>
                      </div>
                    )}
                  </div>
                  {activeItem.patient.medicalNotes && (
                    <div className="mt-3 rounded border border-warning/30 bg-warning/5 p-3">
                      <p className="text-xs font-semibold text-warning mb-1">
                        {L.medNotes}
                      </p>
                      <p className="text-sm text-foreground">
                        {activeItem.patient.medicalNotes}
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Prescription form */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {template?.header?.logoUrl && (
                      <img
                        src={template.header.logoUrl}
                        alt=""
                        className="h-8 w-8 rounded object-cover"
                      />
                    )}
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        {L.encounterTitle}
                      </h2>
                      {template?.header?.clinicName && (
                        <p className="text-xs text-muted">
                          {template.header.clinicName}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {/* Diagnosis */}
                    <Input
                      label={L.diagnosis}
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                    />

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-foreground">
                        {L.notesLabel}
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-20 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary/30 transition-shadow focus:ring-2"
                      />
                    </div>

                    {/* Medications */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-foreground">
                          {L.medications}
                        </h3>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setRows((r) => [...r, emptyMedication()])
                          }
                        >
                          {L.add}
                        </Button>
                      </div>
                      {rows.map((row, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 gap-2 rounded border border-card-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                        >
                          <CatalogSelect
                            label={L.medicine}
                            value={row.name}
                            onChange={(v) => applyMedication(idx, v)}
                            options={catalogMedications.map((m) => m.name)}
                            placeholder={
                              isAr ? "اختر أو اكتب..." : "Select or type..."
                            }
                          />
                          <Input
                            label={L.dose}
                            value={row.dose}
                            onChange={(e) =>
                              updateRow(idx, { dose: e.target.value })
                            }
                          />
                          <Input
                            label={L.frequency}
                            value={row.frequency}
                            onChange={(e) =>
                              updateRow(idx, { frequency: e.target.value })
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="self-end"
                            disabled={rows.length === 1}
                            onClick={() =>
                              setRows((r) => r.filter((_, i) => i !== idx))
                            }
                          >
                            {L.remove}
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Tests */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-foreground">
                          {L.tests}
                        </h3>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setRequestedTests((t) => [...t, ""])}
                        >
                          {L.add}
                        </Button>
                      </div>
                      {requestedTests.map((test, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-[1fr_auto] gap-2 items-end"
                        >
                          <CatalogSelect
                            value={test}
                            onChange={(v) =>
                              setRequestedTests((t) =>
                                t.map((x, i) => (i === idx ? v : x)),
                              )
                            }
                            options={catalogTests}
                            placeholder={
                              isAr ? "اختر أو اكتب..." : "Select or type..."
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={requestedTests.length === 1}
                            onClick={() =>
                              setRequestedTests((t) =>
                                t.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            {L.remove}
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Imaging */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-foreground">
                          {L.imaging}
                        </h3>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setRequestedImaging((i) => [...i, ""])}
                        >
                          {L.add}
                        </Button>
                      </div>
                      {requestedImaging.map((img, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-[1fr_auto] gap-2 items-end"
                        >
                          <CatalogSelect
                            value={img}
                            onChange={(v) =>
                              setRequestedImaging((arr) =>
                                arr.map((x, i) => (i === idx ? v : x)),
                              )
                            }
                            options={catalogImaging.map((m) => m.name)}
                            placeholder={
                              isAr ? "اختر أو اكتب..." : "Select or type..."
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={requestedImaging.length === 1}
                            onClick={() =>
                              setRequestedImaging((arr) =>
                                arr.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            {L.remove}
                          </Button>
                        </div>
                      ))}
                    </div>

                    {saveError && <Alert variant="error">{saveError}</Alert>}
                    {savedAt && <Alert variant="success">{L.savedOk}</Alert>}
                    <div className="rounded-lg border border-dashed border-card-border bg-surface px-4 py-4 space-y-3">
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {L.optionalFile}
                            </p>
                            <span
                              className={`text-xs font-medium tabular-nums px-1.5 py-0.5 rounded-full ${uploadFiles.length >= MAX_UPLOAD_FILES ? "bg-danger/10 text-danger" : "bg-surface-2 text-muted"}`}
                            >
                              {uploadFiles.length}/{MAX_UPLOAD_FILES}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted">
                            {L.optionalFileHint}
                          </p>
                        </div>
                        <label
                          className={`shrink-0 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${uploadFiles.length >= MAX_UPLOAD_FILES ? "border-border bg-surface-2 text-muted cursor-not-allowed opacity-50 pointer-events-none" : "border-border bg-surface text-foreground hover:bg-surface-2"}`}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          {isAr ? "إضافة ملفات" : "Add Files"}
                          <input
                            type="file"
                            multiple
                            accept="image/*,application/pdf"
                            className="hidden"
                            disabled={uploadFiles.length >= MAX_UPLOAD_FILES}
                            onChange={(event) => {
                              const files = event.target.files;
                              handleUploadFiles(files);
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>

                      {/* ── Upload now button ── */}
                      {uploadFiles.filter((f) => !f.error).length > 0 && (
                        <div className="flex justify-end">
                          <Button
                            variant="primary"
                            size="sm"
                            loading={uploadingFile}
                            disabled={uploadingFile}
                            onClick={() =>
                              void uploadFilesNow(
                                activeItem!.patient.id,
                                activeItem!.id,
                              )
                            }
                          >
                            {uploadingFile
                              ? isAr
                                ? "جارٍ الرفع..."
                                : "Uploading..."
                              : isAr
                                ? `رفع ${uploadFiles.filter((f) => !f.error).length} ملف الآن`
                                : `Upload ${uploadFiles.filter((f) => !f.error).length} file(s) now`}
                          </Button>
                        </div>
                      )}

                      {/* File previews grid */}
                      {uploadFiles.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                          {uploadFiles.map((item, index) => (
                            <div
                              key={`${item.file.name}-${index}`}
                              className={`group relative rounded-lg border bg-card overflow-hidden ${item.error ? "border-danger/40" : "border-border"}`}
                            >
                              {/* Remove button */}
                              <button
                                type="button"
                                onClick={() => removeUploadFile(index)}
                                className="absolute top-1 end-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
                                aria-label={L.removeFile}
                              >
                                ✕
                              </button>
                              {/* Preview */}
                              {item.url ? (
                                <img
                                  src={item.url}
                                  alt={item.file.name}
                                  className="h-16 w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-16 flex-col items-center justify-center gap-1 bg-surface-2">
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    className="text-muted"
                                  >
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                  </svg>
                                  <span className="text-[9px] font-bold text-muted uppercase">
                                    PDF
                                  </span>
                                </div>
                              )}
                              {/* File name */}
                              <div className="px-1.5 py-1">
                                <p className="truncate text-[10px] text-foreground leading-tight">
                                  {item.file.name}
                                </p>
                                {item.error ? (
                                  <p className="text-[9px] text-danger leading-tight mt-0.5">
                                    {isAr ? "غير مدعوم" : "Invalid"}
                                  </p>
                                ) : (
                                  <p className="text-[9px] text-muted leading-tight mt-0.5">
                                    {(item.file.size / 1024).toFixed(0)} KB
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          {/* Empty slots */}
                          {uploadFiles.length < MAX_UPLOAD_FILES &&
                            Array.from({
                              length: MAX_UPLOAD_FILES - uploadFiles.length,
                            }).map((_, i) => (
                              <div
                                key={`empty-${i}`}
                                className="h-[calc(64px+36px)] rounded-lg border border-dashed border-border/40 bg-surface-2/30"
                              />
                            ))}
                        </div>
                      ) : (
                        // FIX-6: Empty state was a plain non-interactive div — clicking it did nothing.
                        // Converted to a <label> wrapping a hidden file input so the whole area is clickable.
                        <label className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/40 py-6 text-center cursor-pointer hover:border-primary/40 transition-colors">
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="text-muted/50"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          <p className="text-xs text-muted">
                            {isAr
                              ? `اختر حتى ${MAX_UPLOAD_FILES} ملفات (صور أو PDF)`
                              : `Choose up to ${MAX_UPLOAD_FILES} files (images or PDF)`}
                          </p>
                          <input
                            type="file"
                            multiple
                            accept="image/*,application/pdf"
                            className="hidden"
                            disabled={uploadFiles.length >= MAX_UPLOAD_FILES}
                            onChange={(event) => {
                              handleUploadFiles(event.target.files);
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {/* ── Already-uploaded patient files ── */}
                    {(patientAttachments.length > 0 || loadingAttachments) && (
                      <div className="border-t border-border pt-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {isAr ? "الملفات المرفوعة" : "Uploaded Files"}
                            {!loadingAttachments && (
                              <span className="ms-2 text-xs font-normal text-muted">
                                ({patientAttachments.length}/5)
                              </span>
                            )}
                          </p>
                          {loadingAttachments && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          )}
                        </div>
                        {!loadingAttachments &&
                          patientAttachments.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                              {patientAttachments.map((att) => {
                                const isImg =
                                  att.mimeType?.startsWith("image/") ||
                                  /\.(png|jpe?g|webp|gif)$/i.test(att.name);
                                const isPdf =
                                  att.mimeType === "application/pdf" ||
                                  /\.pdf$/i.test(att.name);
                                const proxyUrl = `/api/upload?url=${encodeURIComponent(att.url)}`;
                                return (
                                  <button
                                    key={att.id}
                                    type="button"
                                    onClick={() => setPreviewAttachment(att)}
                                    className="group relative rounded-lg border border-border bg-card overflow-hidden text-start hover:border-primary/50 transition-colors"
                                    title={att.name}
                                  >
                                    {isImg ? (
                                      <img
                                        src={proxyUrl}
                                        alt={att.name}
                                        className="h-16 w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-16 flex-col items-center justify-center gap-1 bg-surface-2">
                                        <svg
                                          width="18"
                                          height="18"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="1.5"
                                          className="text-muted"
                                        >
                                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                          <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                        <span className="text-[9px] font-bold text-muted uppercase">
                                          {isPdf ? "PDF" : "File"}
                                        </span>
                                      </div>
                                    )}
                                    <div className="px-1.5 py-1">
                                      <p className="truncate text-[10px] text-foreground leading-tight">
                                        {att.name}
                                      </p>
                                      <p className="text-[9px] text-muted leading-tight mt-0.5">
                                        {new Date(
                                          att.uploadedAt,
                                        ).toLocaleDateString(
                                          isAr ? "ar-EG" : "en-GB",
                                        )}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                      </div>
                    )}

                    {/* Installments for active patient */}
                    {activeItem && (
                      <div className="border-t border-border pt-4">
                        <InstallmentsClient
                          patientId={activeItem.patient.id}
                          patientName={activeItem.patient.fullName}
                          showCreate={true}
                        />
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                      <Button
                        variant="primary"
                        loading={savingSystem || uploadingFile}
                        disabled={loadingEnd}
                        onClick={() => void savePrescription(false)}
                      >
                        {L.saveSystem}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={printPrescription}
                        disabled={
                          !lastSavedPrescriptionId || savingSystem || loadingEnd
                        }
                      >
                        {L.printRx}
                      </Button>
                      {/* Lang toggle — عربي / English */}
                      <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => setRxLang("ar")}
                          className={`px-2.5 py-1.5 transition-colors ${rxLang === "ar" ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface-2"}`}
                        >
                          ع
                        </button>
                        <button
                          type="button"
                          onClick={() => setRxLang("en")}
                          className={`px-2.5 py-1.5 transition-colors ${rxLang === "en" ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface-2"}`}
                        >
                          EN
                        </button>
                      </div>
                      <div className="flex-1" />
                      <Button
                        variant="secondary"
                        loading={loadingEnd}
                        disabled={savingSystem}
                        onClick={() => void endVisit()}
                        className="border-danger/40 text-danger hover:bg-danger/10"
                      >
                        {L.endVisit}
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          ) : (
            <Card>
              <CardBody>
                <EmptyState
                  title={isAr ? "لم يتم اختيار مريض بعد" : "No active patient"}
                  description={
                    isAr
                      ? 'اضغط "ابدأ الكشف" على أي مريض في قائمة الانتظار'
                      : 'Press "Start Visit" on a patient from the queue'
                  }
                />
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* ── Attachment preview modal ── */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg border border-card-border bg-card shadow-card-md">
            <div className="flex items-center justify-between gap-3 border-b border-card-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {previewAttachment.name}
                </p>
                <p className="text-xs text-muted">
                  {new Date(previewAttachment.uploadedAt).toLocaleDateString(
                    isAr ? "ar-EG" : "en-GB",
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/upload?url=${encodeURIComponent(previewAttachment.url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-2 transition-colors"
                >
                  {isAr ? "فتح" : "Open"}
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-2 transition-colors"
                >
                  {isAr ? "إغلاق" : "Close"}
                </button>
              </div>
            </div>
            <div className="max-h-[78vh] overflow-auto bg-surface p-4 flex items-center justify-center">
              {previewAttachment.mimeType?.startsWith("image/") ||
              /\.(png|jpe?g|webp|gif)$/i.test(previewAttachment.name) ? (
                <img
                  src={`/api/upload?url=${encodeURIComponent(previewAttachment.url)}`}
                  alt={previewAttachment.name}
                  className="max-h-[72vh] rounded object-contain mx-auto"
                />
              ) : previewAttachment.mimeType === "application/pdf" ||
                /\.pdf$/i.test(previewAttachment.name) ? (
                <iframe
                  src={`/api/upload?url=${encodeURIComponent(previewAttachment.url)}`}
                  title={previewAttachment.name}
                  className="h-[72vh] w-full rounded bg-white"
                />
              ) : (
                <a
                  href={`/api/upload?url=${encodeURIComponent(previewAttachment.url)}`}
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
    </>
  );
}
