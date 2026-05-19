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
import { PhoneInput } from "@/components/ui/phone-input";

type ClinicContext = { clinicName: string; clinicSlug: string };
type Handoff = {
  fullName: string;
  loginMethod: string;
  password: string;
  specialty: string | null;
} & ClinicContext;

const SPECIALTIES = [
  "General Practice",
  "Internal Medicine",
  "Cardiology",
  "Dermatology",
  "Ophthalmology",
  "Orthopedics",
  "Pediatrics",
  "Gynecology",
  "ENT (Ear, Nose & Throat)",
  "Neurology",
  "Psychiatry",
  "Radiology",
  "Oncology",
  "Urology",
  "Gastroenterology",
  "Pulmonology",
  "Endocrinology",
  "Dentistry",
  "Other",
];
const SPECIALTY_LABELS_AR: Record<string, string> = {
  "General Practice": "طب عام",
  "Internal Medicine": "باطنة",
  Cardiology: "قلب",
  Dermatology: "جلدية",
  Ophthalmology: "عيون",
  Orthopedics: "عظام",
  Pediatrics: "أطفال",
  Gynecology: "نساء وتوليد",
  "ENT (Ear, Nose & Throat)": "أنف وأذن وحنجرة",
  Neurology: "مخ وأعصاب",
  Psychiatry: "طب نفسي",
  Radiology: "أشعة",
  Oncology: "أورام",
  Urology: "مسالك بولية",
  Gastroenterology: "جهاز هضمي",
  Pulmonology: "صدرية",
  Endocrinology: "غدد صماء",
  Dentistry: "أسنان",
  Other: "أخرى",
};

export function CreateDoctorForm({
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
  const [specialty, setSpecialty] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [handoff, setHandoff] = useState<Handoff | null>(null);

  const loginUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/${locale}/login`;
  }, [locale]);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setHandoff(null);

    if (!email.trim() && !phone.trim()) {
      setError(
        isAr
          ? "يجب إدخال اسم المستخدم أو رقم الهاتف"
          : "Username or phone number is required",
      );
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/users/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          fullName: fullName.trim(),
          password,
          specialty: specialty || undefined,
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
                ? "تعذر إنشاء الطبيب"
                : "Could not create doctor",
        );
        return;
      }

      const createdEmail =
        typeof data.email === "string" ? data.email : email.trim();
      const createdPhone =
        typeof data.phone === "string" ? data.phone : phone.trim();
      const loginMethod = createdEmail || createdPhone || email.trim();
      const createdName =
        typeof data.fullName === "string" ? data.fullName : fullName.trim();
      const createdSpecialty =
        typeof data.specialty === "string" ? data.specialty : null;
      const clinicName =
        typeof data.clinicName === "string"
          ? data.clinicName
          : clinic.clinicName;
      const clinicSlug =
        typeof data.clinicSlug === "string"
          ? data.clinicSlug
          : clinic.clinicSlug;

      setHandoff({
        fullName: createdName,
        loginMethod,
        password,
        specialty: createdSpecialty,
        clinicName,
        clinicSlug,
      });
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setSpecialty("");
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "إنشاء حساب طبيب" : "Create Doctor Account"}
          </h2>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
            <span className="font-mono bg-surface-2 px-1.5 py-0.5 rounded">
              {clinic.clinicSlug}
            </span>
            <span>{clinic.clinicName}</span>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <Input
              label={isAr ? "الاسم الكامل" : "Full Name"}
              placeholder={isAr ? "د. أحمد مصطفى" : "Dr. Ahmed Mostafa"}
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            {/* Username OR Phone */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={isAr ? "اسم المستخدم" : "Username"}
                placeholder="doctor.name"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                hint={
                  isAr
                    ? "سيتم إنشاء الإيميل تلقائياً: الاسم@clinic.com"
                    : "Email will be created as username@clinic.com"
                }
              />
              <PhoneInput
                label={isAr ? "رقم الهاتف" : "Phone"}
                value={phone}
                onChange={setPhone}
                locale={locale}
              />
            </div>
            {!email && !phone && (
              <p className="text-xs text-muted -mt-2">
                {isAr
                  ? "* يجب إدخال اسم المستخدم أو رقم الهاتف على الأقل"
                  : "* At least username or phone is required"}
              </p>
            )}

            <Input
              label={isAr ? "كلمة المرور المؤقتة" : "Temporary Password"}
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={
                isAr
                  ? "يجب تغييرها بعد أول تسجيل دخول."
                  : "Doctor should change it after first login."
              }
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                {isAr ? "التخصص" : "Specialty"}
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              >
                <option value="">
                  {isAr ? "— اختر التخصص —" : "— Select specialty —"}
                </option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {isAr ? (SPECIALTY_LABELS_AR[s] ?? s) : s}
                  </option>
                ))}
              </select>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onCancel}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" loading={pending}>
                {isAr ? "إنشاء حساب الطبيب" : "Create Doctor Account"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Handoff card */}
      {handoff && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">
              {isAr ? "بيانات تسليم الطبيب" : "Doctor Handoff Sheet"}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {isAr
                ? "شارك هذه البيانات بشكل آمن مع الطبيب."
                : "Share these credentials securely with the doctor"}
            </p>
          </CardHeader>
          <CardBody>
            <dl className="space-y-2 text-sm">
              {[
                [isAr ? "رابط الدخول" : "Portal URL", loginUrl],
                [isAr ? "اسم العيادة" : "Clinic Name", handoff.clinicName],
                [isAr ? "كود العيادة" : "Clinic Code", handoff.clinicSlug],
                [isAr ? "التخصص" : "Specialty", handoff.specialty ?? "—"],
                [isAr ? "الاسم" : "Full Name", handoff.fullName],
                [
                  isAr ? "الدخول (ايميل/هاتف)" : "Login (email/phone)",
                  handoff.loginMethod,
                ],
                [isAr ? "كلمة المرور" : "Password", handoff.password],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <dt className="text-muted w-28 shrink-0 text-xs">{label}</dt>
                  <dd className="font-mono text-foreground text-xs break-all">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-warning bg-warning/8 border border-warning/20 rounded px-2.5 py-1.5">
              {isAr
                ? "⚠ لا ترسل كلمات المرور عبر قنوات غير آمنة."
                : "⚠ Do not send passwords over unsecured channels."}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
