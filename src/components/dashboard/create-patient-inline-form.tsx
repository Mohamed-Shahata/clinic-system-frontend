"use client";

import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";

type CreatedPatient = {
  id: string;
  code: string;
  fullName: string;
  phone?: string | null;
};

function generatePatientCode() {
  return "PT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** يتحقق من أن الاسم ثلاثي على الأقل */
function isTripleName(name: string): boolean {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 3 && parts.every((p) => p.length >= 2);
}

function t(isAr: boolean, ar: string, en: string) {
  return isAr ? ar : en;
}

function validatePatientCode(value: string, isAr: boolean) {
  if (!value.trim()) return t(isAr, "كود المريض مطلوب", "Patient code is required");
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
  if (text.includes("ثلاثي") || text.includes("isTripleName")) {
    return isAr
      ? "الاسم يجب أن يكون ثلاثياً (مثال: محمد علي حسن)"
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
  if (
    text.toLowerCase().includes("fetch") ||
    text.toLowerCase().includes("network") ||
    text.toLowerCase().includes("cannot reach") ||
    text.toLowerCase().includes("econnrefused")
  ) {
    return isAr
      ? "خطأ في الاتصال بالخادم — تحقق من الاتصال"
      : "Network error — check your connection";
  }
  return typeof message === "string" && message
    ? message
    : isAr
      ? "تعذر إنشاء المريض"
      : "Could not create patient";
}

export function CreatePatientInlineForm({
  locale,
  onSuccess,
  onCancel,
}: {
  locale: string;
  onSuccess: (patient: CreatedPatient) => void;
  onCancel: () => void;
}) {
  const isAr = locale === "ar";
  const [fullName, setFullName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [code, setCode] = useState(generatePatientCode);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [ageError, setAgeError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateName(value: string) {
    if (!isTripleName(value)) {
      setNameError(
        isAr
          ? "الاسم يجب أن يكون ثلاثياً (مثال: محمد علي حسن)"
          : "Full name must be at least 3 words (e.g. Mohamed Ali Hassan)",
      );
    } else {
      setNameError(null);
    }
  }

  async function submit() {
    setError(null);
    setNameError(null);
    setCodeError(null);
    setPhoneError(null);
    setAgeError(null);

    let hasError = false;

    if (!fullName.trim() || !isTripleName(fullName)) {
      setNameError(
        isAr
          ? "الاسم يجب أن يكون ثلاثياً (مثال: محمد علي حسن)"
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

    const parsedAge = age ? Number(age) : null;
    if (
      parsedAge !== null &&
      (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 130)
    ) {
      setAgeError(isAr ? "يرجى إدخال سن صحيح بين 0 و 130" : "Please enter a valid age from 0 to 130");
      hasError = true;
    }
    if (hasError) return;
    const derivedBirthDate =
      parsedAge !== null ? `${new Date().getFullYear() - parsedAge}-01-01` : "";
    setPending(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          fullName: fullName.trim(),
          phone: phone.trim(),
          dateOfBirth: derivedBirthDate || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: unknown;
        };
        setError(patientErrorMessage(data.message, isAr));
        return;
      }
      const patient = (await res.json()) as CreatedPatient;
      setCode(generatePatientCode());
      setAge("");
      setNameError(null);
      onSuccess(patient);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      <div className="space-y-1">
        <Input
          label={isAr ? "الاسم الثلاثي *" : "Full Name (3 words min) *"}
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (nameError) validateName(e.target.value);
          }}
          onBlur={() => validateName(fullName)}
          placeholder={isAr ? "محمد علي حسن" : "Mohamed Ali Hassan"}
        />
        {nameError && <p className="text-xs text-danger">{nameError}</p>}
      </div>
      <Input
        label={isAr ? "كود المريض *" : "Patient Code *"}
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          if (codeError) setCodeError(validatePatientCode(e.target.value, isAr));
        }}
        onBlur={(e) => setCodeError(validatePatientCode(e.target.value, isAr))}
        minLength={2}
        maxLength={32}
        placeholder="PT-ABC123"
        error={codeError ?? undefined}
      />
      <Input
        label={isAr ? "رقم الهاتف *" : "Phone *"}
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          if (phoneError) setPhoneError(validatePhone(e.target.value, isAr));
        }}
        onBlur={(e) => setPhoneError(validatePhone(e.target.value, isAr))}
        placeholder={isAr ? "01xxxxxxxxx" : "01xxxxxxxxx"}
        required
        error={phoneError ?? undefined}
      />
      <Input
        label={isAr ? "السن" : "Age"}
        type="number"
        value={age}
        min={0}
        max={130}
        onChange={(e) => {
          setAge(e.target.value);
          if (ageError) {
            const nextAge = e.target.value ? Number(e.target.value) : null;
            setAgeError(
              nextAge !== null &&
                (!Number.isInteger(nextAge) || nextAge < 0 || nextAge > 130)
                ? isAr
                  ? "يرجى إدخال سن صحيح بين 0 و 130"
                  : "Please enter a valid age from 0 to 130"
                : null,
            );
          }
        }}
        placeholder={isAr ? "مثال: 20" : "Example: 20"}
        error={ageError ?? undefined}
      />
      <p className="text-xs text-muted">
        {isAr
          ? "بعد إنشاء المريض سيتم تحديده تلقائيًا لإكمال الحجز"
          : "After creating the patient, they will be selected automatically to complete the booking"}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {isAr ? "رجوع" : "Back"}
        </Button>
        <Button loading={pending} onClick={() => void submit()}>
          {isAr ? "إنشاء المريض" : "Create Patient"}
        </Button>
      </div>
    </div>
  );
}
