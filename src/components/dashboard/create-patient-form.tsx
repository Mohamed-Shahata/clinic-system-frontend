"use client";

import { useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import {
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Alert,
} from "@/components/ui";

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

/** يتحقق من أن الاسم ثلاثي على الأقل (3 أجزاء، كل جزء حرفان فأكثر) */
function isTripleName(name: string): boolean {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 3 && parts.every((p) => p.length >= 2);
}

function patientErrorMessage(message: unknown, isAr: boolean) {
  const text = Array.isArray(message)
    ? message.join(" ")
    : String(message ?? "");
  if (text.includes("ثلاثي") || text.includes("isTripleName")) {
    return isAr
      ? "الاسم يجب أن يكون ثلاثياً على الأقل (مثال: محمد علي حسن)"
      : "Full name must be at least 3 words (e.g. Mohamed Ali Hassan)";
  }
  if (text.includes("code") || text.includes("^[A-Za-z0-9_-]+$")) {
    return isAr
      ? "كود المريض مطلوب ويجب أن يكون من 2 إلى 32 حرفًا أو رقمًا فقط"
      : "Patient code is required and must be 2-32 letters, numbers, underscores, or hyphens";
  }
  if (text.includes("dateOfBirth")) {
    return isAr ? "تاريخ الميلاد غير صالح" : "Date of birth is invalid";
  }
  if (text.includes("phone") || text.includes("هاتف")) {
    return isAr
      ? "رقم الهاتف مطلوب وغير صالح"
      : "A valid phone number is required";
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
  const [nameError, setNameError] = useState<string | null>(null);
  const [code, setCode] = useState(generateCode());
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedPatient | null>(null);

  function validateName(value: string) {
    if (!isTripleName(value)) {
      setNameError(
        isAr
          ? "الاسم يجب أن يكون ثلاثياً على الأقل (مثال: محمد علي حسن)"
          : "Full name must be at least 3 words (e.g. Mohamed Ali Hassan)",
      );
    } else {
      setNameError(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);

    // Client-side triple name validation
    if (!isTripleName(fullName)) {
      setNameError(
        isAr
          ? "الاسم يجب أن يكون ثلاثياً على الأقل (مثال: محمد علي حسن)"
          : "Full name must be at least 3 words (e.g. Mohamed Ali Hassan)",
      );
      return;
    }

    // Phone required client-side
    if (!phone.trim()) {
      setError(isAr ? "رقم الهاتف مطلوب" : "Phone number is required");
      return;
    }

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
          phone: phone.trim(),
          dateOfBirth: dateOfBirth || undefined,
          medicalNotes: allowMedicalNotes
            ? medicalNotes.trim() || undefined
            : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
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
      setNameError(null);
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">
          {isAr ? "تسجيل مريض جديد" : "Register Patient"}
        </h2>
        <p className="text-xs text-muted mt-0.5">
          {isAr
            ? "أضف مريضاً جديداً في العيادة"
            : "Add a new patient to the clinic"}
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label={isAr ? "كود المريض" : "Patient Code"}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                minLength={2}
                maxLength={32}
                pattern="[A-Za-z0-9_-]+"
                hint={
                  isAr
                    ? "تلقائي — يمكن تعديله"
                    : "Auto-generated — can be edited"
                }
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

          <div className="space-y-1">
            <Input
              label={isAr ? "الاسم الثلاثي *" : "Full Name (3 words min) *"}
              placeholder={isAr ? "محمد علي حسن" : "Mohamed Ali Hassan"}
              required
              minLength={6}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (nameError) validateName(e.target.value);
              }}
              onBlur={() => validateName(fullName)}
            />
            {nameError && <p className="text-xs text-danger">{nameError}</p>}
          </div>

          <Input
            label={isAr ? "رقم الهاتف *" : "Phone Number *"}
            type="tel"
            placeholder="+20 10x xxxx xxxx"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            label={isAr ? "تاريخ الميلاد" : "Date of Birth"}
            type="date"
            value={dateOfBirth}
            max={today}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />

          {allowMedicalNotes && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                {isAr ? "ملاحظات طبية" : "Medical Notes"}
              </label>
              <textarea
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                rows={3}
                placeholder={
                  isAr
                    ? "حساسية، أمراض مزمنة، ملاحظات..."
                    : "Allergies, chronic conditions, notes..."
                }
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none ring-primary/30 focus:ring-2 resize-none"
              />
            </div>
          )}

          {error && <Alert variant="error">{error}</Alert>}
          {created && (
            <Alert variant="success">
              <div>
                <p className="font-medium">
                  {isAr ? "تم تسجيل المريض!" : "Patient registered!"}
                </p>
                <p className="text-xs font-mono mt-0.5">
                  {created.code} · {created.fullName}
                </p>
              </div>
            </Alert>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" loading={pending}>
              {isAr ? "تسجيل المريض" : "Register Patient"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
