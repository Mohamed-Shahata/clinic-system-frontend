"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
} from "@/components/ui";

type MedicationRow = { name: string; dose: string; duration: string };
type Template = {
  header?: { clinicName?: string; logoUrl?: string | null; address?: string };
  footer?: { phone?: string; workingHours?: string; notes?: string };
};
type PatientInfo = {
  fullName: string;
  code?: string;
  phone?: string;
  dateOfBirth?: string | null;
};
type DoctorInfo = {
  fullName: string;
  specialty?: string | null;
};

const emptyMedication = (): MedicationRow => ({
  name: "",
  dose: "",
  duration: "",
});

export function PrescriptionForm({
  patientId,
  appointmentId,
  patient,
  doctor,
  locale,
}: {
  patientId: string;
  appointmentId?: string;
  patient: PatientInfo;
  doctor: DoctorInfo;
  locale: string;
}) {
  const router = useRouter();
  const isAr = locale === "ar";
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [requestedTests, setRequestedTests] = useState<string[]>([""]);
  const [requestedImaging, setRequestedImaging] = useState<string[]>([""]);
  const [rows, setRows] = useState<MedicationRow[]>([emptyMedication()]);
  const [catalogMedications, setCatalogMedications] = useState<
    Array<{
      name: string;
      dose?: string;
      frequency?: string;
      duration?: string;
    }>
  >([]);
  const [testCatalog, setTestCatalog] = useState<string[]>([]);
  const [imaging, setImaging] = useState<Array<{ name: string }>>([]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = useMemo(
    () => ({
      title: isAr ? "بيانات الكشف" : "Clinical Encounter",
      diagnosis: isAr ? "التشخيص" : "Diagnosis",
      notes: isAr ? "ملاحظات" : "Notes",
      tests: isAr ? "التحاليل المطلوبة" : "Requested tests",
      imaging: isAr ? "الأشعة المطلوبة" : "Requested imaging",
      medications: isAr ? "الأدوية" : "Medications",
      medicine: isAr ? "اسم الدواء" : "Medication name",
      dose: isAr ? "الجرعة" : "Dose",
      duration: isAr ? "المدة" : "Duration",
      add: isAr ? "إضافة" : "Add",
      remove: isAr ? "حذف" : "Remove",
      save: isAr ? "حفظ في السيستم" : "Save",
      saved: isAr ? "تم حفظ الكشف." : "Encounter saved.",
      hint: isAr
        ? "أضف كل عنصر في سطر منفصل."
        : "Add each item on a separate row.",
    }),
    [isAr],
  );

  useEffect(() => {
    void fetch("/api/prescriptions/catalog/medications")
      .then((res) => res.json())
      .then((data) => setCatalogMedications(Array.isArray(data) ? data : []));
    void fetch("/api/prescriptions/catalog/imaging")
      .then((res) => res.json())
      .then((data) => setImaging(Array.isArray(data) ? data : []));
    void fetch("/api/prescriptions/template")
      .then((res) => res.json())
      .then((data) => setTemplate(data));
  }, []);

  function updateRow(index: number, patch: Partial<MedicationRow>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function applyMedication(index: number, name: string) {
    const match = catalogMedications.find((item) => item.name === name);
    updateRow(index, {
      name,
      dose: match
        ? [match.dose, match.frequency].filter(Boolean).join(" - ")
        : (rows[index]?.dose ?? ""),
      duration: match?.duration ?? rows[index]?.duration ?? "",
    });
  }

  function updateRequestedTests(index: number, value: string) {
    setRequestedTests((current) =>
      current.map((item, i) => (i === index ? value : item)),
    );
    const trimmed = value.trim();
    if (!trimmed) return;
    setTestCatalog((current) =>
      current.includes(trimmed) ? current : [...current, trimmed],
    );
  }

  function addRequestedTest() {
    setRequestedTests((current) => [...current, ""]);
  }

  function removeRequestedTest(index: number) {
    setRequestedTests((current) => current.filter((_, i) => i !== index));
  }

  function updateRequestedImaging(index: number, value: string) {
    setRequestedImaging((current) =>
      current.map((item, i) => (i === index ? value : item)),
    );
  }

  function addRequestedImaging() {
    setRequestedImaging((current) => [...current, ""]);
  }

  function removeRequestedImaging(index: number) {
    setRequestedImaging((current) => current.filter((_, i) => i !== index));
  }

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError(null);
    setPending(true);
    setSavedAt(null);
    try {
      const meds = rows
        .map((row) => ({
          name: row.name.trim(),
          dose: row.dose.trim(),
          duration: row.duration.trim(),
        }))
        .filter((row) => row.name);

      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          appointmentId,
          diagnosis: diagnosis.trim() || undefined,
          notes: notes.trim() || undefined,
          medications: meds,
          requestedTests: requestedTests
            .map((item) => item.trim())
            .filter(Boolean),
          requestedImaging: requestedImaging
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setError(
          data.message ??
            (isAr ? "تعذر حفظ الكشف" : "Could not save prescription"),
        );
        return;
      }
      const saved = new Date().toISOString();
      setSavedAt(saved);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {template?.header?.logoUrl && (
            <img
              src={template.header.logoUrl}
              alt=""
              className="h-9 w-9 rounded object-cover"
            />
          )}
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {labels.title}
            </h2>
            {template?.header?.clinicName && (
              <p className="text-xs text-muted">{template.header.clinicName}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Input
            label={labels.diagnosis}
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {labels.notes}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary/30 transition-shadow focus:ring-2"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                {labels.medications}
              </h3>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setRows((current) => [...current, emptyMedication()])
                }
              >
                {labels.add}
              </Button>
            </div>
            <datalist id="medication-catalog">
              {catalogMedications.map((item) => (
                <option key={item.name} value={item.name} />
              ))}
            </datalist>
            {rows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 rounded border border-card-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <Input
                  label={labels.medicine}
                  type="search"
                  placeholder={
                    isAr ? "ابحث عن اسم الدواء" : "Search medication"
                  }
                  required={index === 0}
                  list="medication-catalog"
                  value={row.name}
                  onChange={(e) => applyMedication(index, e.target.value)}
                />
                <Input
                  label={labels.dose}
                  value={row.dose}
                  onChange={(e) => updateRow(index, { dose: e.target.value })}
                />
                <Input
                  label={labels.duration}
                  value={row.duration}
                  onChange={(e) =>
                    updateRow(index, { duration: e.target.value })
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="self-end"
                  disabled={rows.length === 1}
                  onClick={() =>
                    setRows((current) => current.filter((_, i) => i !== index))
                  }
                >
                  {labels.remove}
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                {labels.tests}
              </h3>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={addRequestedTest}
              >
                {labels.add}
              </Button>
            </div>
            <datalist id="test-catalog">
              {testCatalog.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {requestedTests.map((test, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 rounded border border-card-border p-3 sm:grid-cols-[1fr_auto]"
              >
                <Input
                  label={index === 0 ? labels.tests : undefined}
                  type="search"
                  placeholder={
                    isAr ? "ابحث عن اسم التحليل" : "Search test name"
                  }
                  list="test-catalog"
                  value={test}
                  onChange={(e) => updateRequestedTests(index, e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={requestedTests.length === 1}
                  onClick={() => removeRequestedTest(index)}
                >
                  {labels.remove}
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                {labels.imaging}
              </h3>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={addRequestedImaging}
              >
                {labels.add}
              </Button>
            </div>
            <datalist id="imaging-catalog">
              {imaging.map((item) => (
                <option key={item.name} value={item.name} />
              ))}
            </datalist>
            {requestedImaging.map((test, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 rounded border border-card-border p-3 sm:grid-cols-[1fr_auto]"
              >
                <Input
                  label={index === 0 ? labels.imaging : undefined}
                  type="search"
                  placeholder={
                    isAr ? "ابحث عن اسم الأشعة" : "Search imaging/test"
                  }
                  list="imaging-catalog"
                  value={test}
                  onChange={(e) =>
                    updateRequestedImaging(index, e.target.value)
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={requestedImaging.length === 1}
                  onClick={() => removeRequestedImaging(index)}
                >
                  {labels.remove}
                </Button>
              </div>
            ))}
          </div>

          {error && <Alert variant="error">{error}</Alert>}
          {savedAt && <Alert variant="success">{labels.saved}</Alert>}
          <Button type="submit" loading={pending} className="w-full">
            {labels.save}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
