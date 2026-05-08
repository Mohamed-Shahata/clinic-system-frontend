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

function patientErrorMessage(message: unknown, isAr: boolean) {
  const text = Array.isArray(message) ? message.join(" ") : String(message ?? "");
  if (text.includes("code") || text.includes("^[A-Za-z0-9_-]+$")) {
    return isAr
      ? "كود المريض مطلوب ويجب أن يكون من 2 إلى 32 حرفًا أو رقمًا فقط"
      : "Patient code is required and must be 2-32 letters, numbers, underscores, or hyphens";
  }
  if (text.includes("dateOfBirth")) {
    return isAr
      ? "تاريخ الميلاد غير صالح"
      : "Date of birth is invalid";
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
  const [code, setCode] = useState(generatePatientCode);
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!fullName.trim()) {
      setError(isAr ? "يرجى إدخال الاسم" : "Please enter a name");
      return;
    }
    const parsedAge = age ? Number(age) : null;
    if (
      parsedAge !== null &&
      (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 130)
    ) {
      setError(isAr ? "يرجى إدخال سن صحيح" : "Please enter a valid age");
      return;
    }
    const derivedBirthDate =
      parsedAge !== null
        ? `${new Date().getFullYear() - parsedAge}-01-01`
        : "";
    setPending(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
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
      onSuccess(patient);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      <Input
        label={isAr ? "الاسم الكامل *" : "Full Name *"}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder={isAr ? "اسم المريض" : "Patient name"}
      />
      <Input
        label={isAr ? "كود المريض *" : "Patient Code *"}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        minLength={2}
        maxLength={32}
        pattern="[A-Za-z0-9_-]+"
        placeholder="PT-ABC123"
      />
      <Input
        label={isAr ? "رقم الهاتف" : "Phone"}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder={isAr ? "اختياري" : "Optional"}
      />
      <Input
        label={isAr ? "السن" : "Age"}
        type="number"
        value={age}
        min={0}
        max={130}
        onChange={(e) => setAge(e.target.value)}
        placeholder={isAr ? "مثال: 20" : "Example: 20"}
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
