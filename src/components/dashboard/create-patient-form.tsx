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

function t(isAr: boolean, ar: string, en: string) {
  return isAr ? ar : en;
}

/** يتحقق من أن الاسم ثلاثي على الأقل (3 أجزاء، كل جزء حرفان فأكثر) */
function isTripleName(name: string): boolean {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 3 && parts.every((p) => p.length >= 2);
}

function validatePatientCode(value: string, isAr: boolean) {
  if (!value.trim()) {
    return t(isAr, "كود المريض مطلوب", "Patient code is required");
  }
  if (value.length < 2 || value.length > 32 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    return t(
      isAr,
      "كود المريض يجب أن يكون 2-32 حرفًا أو رقمًا، ويسمح بـ _ و - فقط",
      "Patient code must be 2-32 letters or numbers, with only _ and - allowed",
    );
  }
  return null;
}

function validatePhone(value: string, isAr: boolean) {
  const phone = value.trim();
  if (!phone) return t(isAr, "رقم الهاتف مطلوب", "Phone number is required");
  if (!/^\+?[0-9\s-]{8,20}$/.test(phone)) {
    return t(
      isAr,
      "رقم الهاتف غير صالح، أدخل 8 إلى 20 رقمًا",
      "Phone number is invalid, enter 8 to 20 digits",
    );
  }
  return null;
}

function patientErrorMessage(message: unknown, isAr: boolean) {
  const text = Array.isArray(message)
    ? message.join(" ")
    : String(message ?? "");

  if (
    text.toLowerCase().includes("insufficient role") ||
    text.toLowerCase().includes("forbidden") ||
    text.toLowerCase().includes("not allowed") ||
    text.toLowerCase().includes("permission")
  ) {
    return t(
      isAr,
      "غير مسموح لك بإنشاء مريض — تواصل مع مدير العيادة",
      "You don't have permission to create patients — contact your clinic admin",
    );
  }
  if (text.includes("ثلاثي") || text.includes("isTripleName")) {
    return t(
      isAr,
      "الاسم يجب أن يكون ثلاثياً على الأقل (مثال: محمد علي حسن)",
      "Full name must be at least 3 words (e.g. Mohamed Ali Hassan)",
    );
  }
  if (text.includes("code") || text.includes("^[A-Za-z0-9_-]+$")) {
    return t(
      isAr,
      "كود المريض مطلوب ويجب أن يكون من 2 إلى 32 حرفًا أو رقمًا فقط",
      "Patient code is required and must be 2-32 letters, numbers, underscores, or hyphens",
    );
  }
  if (
    text.toLowerCase().includes("already exists") ||
    text.includes("unique") ||
    text.includes("duplicate")
  ) {
    return t(
      isAr,
      "هذا الكود أو رقم الهاتف مسجل بالفعل — جرب كود آخر أو ابحث عن المريض",
      "This code or phone is already registered — try another code or search for the patient",
    );
  }
  if (text.includes("dateOfBirth")) {
    return t(isAr, "تاريخ الميلاد غير صالح", "Date of birth is invalid");
  }
  if (text.includes("phone") || text.includes("هاتف")) {
    return t(isAr, "رقم الهاتف مطلوب وغير صالح", "A valid phone number is required");
  }
  if (
    text.toLowerCase().includes("network") ||
    text.toLowerCase().includes("fetch") ||
    text.toLowerCase().includes("cannot reach") ||
    text.toLowerCase().includes("econnrefused")
  ) {
    return t(
      isAr,
      "خطأ في الاتصال بالخادم — تحقق من الإنترنت",
      "Network error — check your connection",
    );
  }
  return typeof message === "string" && message
    ? message
    : t(
        isAr,
        "تعذر تسجيل المريض، حاول مرة أخرى",
        "Failed to register patient, please try again",
      );
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
  const [codeError, setCodeError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
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
    setNameError(null);
    setCodeError(null);
    setPhoneError(null);
    setDateError(null);

    let hasError = false;

    // Client-side triple name validation
    if (!isTripleName(fullName)) {
      setNameError(
        isAr
          ? "الاسم يجب أن يكون ثلاثياً على الأقل (مثال: محمد علي حسن)"
          : "Full name must be at least 3 words (e.g. Mohamed Ali Hassan)",
      );
      hasError = true;
    }

    const nextCodeError = validatePatientCode(code, isAr);
    if (nextCodeError) {
      setCodeError(nextCodeError);
      hasError = true;
    }

    const nextPhoneError = validatePhone(phone, isAr);
    if (nextPhoneError) {
      setPhoneError(nextPhoneError);
      hasError = true;
    }

    if (dateOfBirth && dateOfBirth > today) {
      setDateError(
        isAr
          ? "تاريخ الميلاد لا يمكن أن يكون في المستقبل"
          : "Date of birth cannot be in the future",
      );
      hasError = true;
    }
    if (hasError) return;

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
                onBlur={(e) => setCodeError(validatePatientCode(e.target.value, isAr))}
                error={codeError ?? undefined}
                required
                minLength={2}
                maxLength={32}
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
            onChange={(e) => {
              setPhone(e.target.value);
              if (phoneError) setPhoneError(validatePhone(e.target.value, isAr));
            }}
            onBlur={(e) => setPhoneError(validatePhone(e.target.value, isAr))}
            error={phoneError ?? undefined}
          />

          <Input
            label={isAr ? "تاريخ الميلاد" : "Date of Birth"}
            type="date"
            value={dateOfBirth}
            max={today}
            onChange={(e) => {
              setDateOfBirth(e.target.value);
              if (dateError) {
                setDateError(
                  e.target.value && e.target.value > today
                    ? isAr
                      ? "تاريخ الميلاد لا يمكن أن يكون في المستقبل"
                      : "Date of birth cannot be in the future"
                    : null,
                );
              }
            }}
            error={dateError ?? undefined}
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
