"use client";

import { useLocale } from "next-intl";
import { FormEvent, useMemo, useState } from "react";
import {
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Alert,
} from "@/components/ui";

type ClinicContext = { clinicName: string; clinicSlug: string };

export function CreateReceptionistForm({
  clinic,
  onCancel,
  onSuccess,
}: {
  clinic: ClinicContext;
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loginUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/${locale}/login`;
  }, [locale]);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    // ✅ تحقق إن في email أو phone على الأقل
    if (!email.trim() && !phone.trim()) {
      setError(
        isAr
          ? "يجب إدخال البريد الإلكتروني أو رقم الهاتف"
          : "Email or phone number is required",
      );
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/users/receptionists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          fullName: fullName.trim(),
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        setError(
          Array.isArray(data.message)
            ? isAr
              ? "تحقق من المدخلات."
              : "Validation error — check all fields"
            : typeof data.message === "string"
              ? data.message
              : isAr
                ? "تعذر إنشاء موظف الاستقبال"
                : "Could not create receptionist",
        );
        return;
      }

      const createdEmail =
        typeof data.email === "string" ? data.email : email.trim();
      const createdPhone =
        typeof data.phone === "string" ? data.phone : phone.trim();
      const loginMethod = createdEmail || createdPhone;
      setFeedback(
        isAr
          ? `✓ تم إنشاء الحساب — بيانات الدخول: ${loginMethod} / ${password} — رابط: ${loginUrl}`
          : `✓ Account created — login: ${loginMethod} / ${password} — url: ${loginUrl}`,
      );
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      window.dispatchEvent(new Event("clinic:receptionist-created"));
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">
          {isAr ? "إضافة موظف استقبال" : "Add Receptionist"}
        </h2>
        <p className="text-xs text-muted mt-0.5">
          {isAr
            ? `عيادة: ${clinic.clinicName}`
            : `Clinic: ${clinic.clinicName}`}
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <Input
            label={isAr ? "الاسم الكامل" : "Full Name"}
            required
            minLength={2}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          {/* ✅ Email OR Phone - at least one required */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={isAr ? "البريد الإلكتروني" : "Email (optional)"}
              type="email"
              placeholder="staff@clinic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label={isAr ? "رقم الهاتف" : "Phone (optional)"}
              type="tel"
              placeholder="01000000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {!email && !phone && (
            <p className="text-xs text-muted -mt-2">
              {isAr
                ? "* يجب إدخال البريد الإلكتروني أو رقم الهاتف على الأقل"
                : "* At least email or phone is required"}
            </p>
          )}

          <Input
            label={isAr ? "كلمة المرور" : "Password"}
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <Alert variant="error">{error}</Alert>}
          {feedback && (
            <Alert variant="success">
              <p className="break-all">{feedback}</p>
            </Alert>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onCancel}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" loading={pending}>
              {isAr ? "إنشاء الحساب" : "Create Account"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
