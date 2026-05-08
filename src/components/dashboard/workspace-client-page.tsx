"use client";

import { useState, useEffect, useCallback } from "react";
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

type MedicationRow = { name: string; dose: string; duration: string };

type CatalogMedication = {
  name: string;
  dose?: string;
  frequency?: string;
  duration?: string;
};

type Template = {
  header?: { clinicName?: string; logoUrl?: string | null; address?: string };
  footer?: { phone?: string; workingHours?: string; notes?: string };
};

const emptyMedication = (): MedicationRow => ({
  name: "",
  dose: "",
  duration: "",
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
        onBlur={() => setTimeout(() => setOpen(false), 150)}
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
      variant: "default" | "warning" | "success" | "danger" | "muted";
      label: string;
      labelAr: string;
    }
  > = {
    IN_QUEUE: { variant: "default", label: "In Queue", labelAr: "في الانتظار" },
    IN_PROGRESS: {
      variant: "warning",
      label: "In Progress",
      labelAr: "قيد التنفيذ",
    },
    COMPLETED: { variant: "success", label: "Completed", labelAr: "مكتمل" },
    CANCELLED: { variant: "danger", label: "Cancelled", labelAr: "ملغي" },
    BOOKED: { variant: "default", label: "Booked", labelAr: "محجوز" },
    CHECKED_IN: { variant: "default", label: "Checked In", labelAr: "وصل" },
  };
  const entry = map[status] ?? {
    variant: "default" as const,
    label: status,
    labelAr: status,
  };
  return (
    <Badge variant={entry.variant}>{isAr ? entry.labelAr : entry.label}</Badge>
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
  const [loadingStart, setLoadingStart] = useState<string | null>(null);
  const [loadingEnd, setLoadingEnd] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingSystem, setSavingSystem] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedPrescriptionId, setLastSavedPrescriptionId] = useState<
    string | null
  >(null);

  /* ── Prescription form state ── */
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [requestedTests, setRequestedTests] = useState<string[]>([""]);
  const [requestedImaging, setRequestedImaging] = useState<string[]>([""]);
  const [rows, setRows] = useState<MedicationRow[]>([emptyMedication()]);

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
    duration: isAr ? "المدة" : "Duration",
    add: isAr ? "إضافة" : "Add",
    remove: isAr ? "حذف" : "Remove",
    saveDraft: isAr ? "حفظ مسودة" : "Save Draft",
    saveSystem: isAr ? "حفظ في السيستم" : "Save to System",
    printRx: isAr ? "طباعة الروشتة" : "Print Prescription",
    endVisit: isAr ? "إنهاء الكشف" : "End Visit",
    savedOk: isAr ? "تم الحفظ بنجاح." : "Saved successfully.",
    age: isAr ? "العمر" : "Age",
    years: isAr ? "سنة" : "yrs",
    code: isAr ? "الكود" : "Code",
    phone: isAr ? "الهاتف" : "Phone",
    visitType: isAr ? "نوع الزيارة" : "Visit Type",
    medNotes: isAr ? "ملاحظات طبية" : "Medical Notes",
    refreshQueue: isAr ? "تحديث القائمة" : "Refresh Queue",
    queueOrder: isAr ? "الترتيب" : "#",
  };

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
  }

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

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => {
      void refreshQueue();
    }, 30_000);
    return () => clearInterval(id);
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
    if (isDraft) setSavingDraft(true);
    else setSavingSystem(true);
    try {
      const meds = rows
        .map((r) => ({
          name: r.name.trim(),
          dose: r.dose.trim(),
          duration: r.duration.trim(),
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
      addToast("success", L.savedOk);
    } catch {
      setSaveError(isAr ? "حدث خطأ" : "Something went wrong");
    } finally {
      setSavingDraft(false);
      setSavingSystem(false);
    }
  }

  /* ── Print prescription ── */
  function printPrescription() {
    if (!lastSavedPrescriptionId) {
      addToast(
        "error",
        isAr ? "احفظ الروشتة أولاً" : "Save the prescription first",
      );
      return;
    }
    window.open(
      `/api/prescriptions/${lastSavedPrescriptionId}/print`,
      "_blank",
    );
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
      duration: match?.duration ?? rows[index]?.duration ?? "",
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        {/* ── LEFT: Queue Panel ── */}
        <div className="flex flex-col gap-4">
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
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      {/* Order number */}
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.patient.fullName}
                        </p>
                        <p className="text-xs text-muted font-mono">
                          {item.patient.code}
                        </p>
                      </div>
                      {statusBadge(item.status, isAr)}
                      {/* Only allow starting if no active patient */}
                      {!inProgressItem && (
                        <Button
                          size="sm"
                          variant="success"
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
                      <p className="text-xs text-muted mb-0.5">{L.visitType}</p>
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
                          label={L.duration}
                          value={row.duration}
                          onChange={(e) =>
                            updateRow(idx, { duration: e.target.value })
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

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                    <Button
                      variant="secondary"
                      loading={savingDraft}
                      disabled={savingSystem || loadingEnd}
                      onClick={() => void savePrescription(true)}
                    >
                      {L.saveDraft}
                    </Button>
                    <Button
                      variant="primary"
                      loading={savingSystem}
                      disabled={savingDraft || loadingEnd}
                      onClick={() => void savePrescription(false)}
                    >
                      {L.saveSystem}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={printPrescription}
                      disabled={
                        !lastSavedPrescriptionId ||
                        savingDraft ||
                        savingSystem ||
                        loadingEnd
                      }
                    >
                      🖨 {L.printRx}
                    </Button>
                    <Button
                      variant="danger"
                      loading={loadingEnd}
                      disabled={savingDraft || savingSystem}
                      onClick={() => void endVisit()}
                    >
                      ✓ {L.endVisit}
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
  );
}
