"use client";

import { useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { Button, Input, Card, CardBody, CardHeader, Alert } from "@/components/ui";

interface CreatedPatient {
  id: string;
  code: string;
  fullName: string;
  phone?: string;
}

function generateCode() {
  return "PT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function patientErrorMessage(message: unknown, isAr: boolean) {
  const text = Array.isArray(message) ? message.join(" ") : String(message ?? "");
  if (text.includes("code") || text.includes("^[A-Za-z0-9_-]+$")) {
    return isAr
      ? "كود المريض مطلوب ويجب أن يكون من 2 إلى 32 حرفًا أو رقمًا فقط"
      : "Patient code is required and must be 2-32 letters, numbers, underscores, or hyphens";
  }
  if (text.includes("dateOfBirth")) {
    return isAr ? "تاريخ الميلاد غير صالح" : "Date of birth is invalid";
  }
  return typeof message === "string" && message
    ? message
    : isAr
      ? "تعذر تسجيل المريض"
      : "Failed to register patient";
}

export function CreatePatientForm({
  allowMedicalNotes = false,
  onCancel,
  onSuccess,
}: {
  allowMedicalNotes?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  const isAr = params?.locale === "ar";
  const today = getTodayInputValue();
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState(generateCode());
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedPatient | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    if (dateOfBirth && dateOfBirth > today) {
      setError(
        isAr
          ? "تاريخ الميلاد لا يمكن أن يكون في المستقبل"
          : "Date of birth cannot be in the future",
      );
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
          medicalNotes: allowMedicalNotes
            ? medicalNotes.trim() || undefined
            : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setError(patientErrorMessage(data.message, isAr));
        return;
      }
      setCreated(data as unknown as CreatedPatient);
      setFullName("");
      setPhone("");
      setDateOfBirth("");
      setMedicalNotes("");
      setCode(generateCode());
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">Register Patient</h2>
        <p className="text-xs text-muted mt-0.5">Add a new patient to the clinic</p>
      </CardHeader>
      <CardBody>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Patient Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                minLength={2}
                maxLength={32}
                pattern="[A-Za-z0-9_-]+"
                hint="Auto-generated — can be edited"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mb-5 shrink-0"
              onClick={() => setCode(generateCode())}
            >
              ↺
            </Button>
          </div>

          <Input
            label="Full Name"
            placeholder="Mohamed Ali Hassan"
            required
            minLength={2}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+20 10x xxxx xxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Date of Birth"
            type="date"
            value={dateOfBirth}
            max={today}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
          {allowMedicalNotes && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Medical Notes</label>
              <textarea
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                rows={3}
                placeholder="Allergies, chronic conditions, notes..."
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none ring-primary/30 focus:ring-2 resize-none"
              />
            </div>
          )}

          {error && <Alert variant="error">{error}</Alert>}
          {created && (
            <Alert variant="success">
              <div>
                <p className="font-medium">Patient registered!</p>
                <p className="text-xs font-mono mt-0.5">{created.code} · {created.fullName}</p>
              </div>
            </Alert>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Register Patient
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
