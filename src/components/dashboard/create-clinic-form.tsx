"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Alert,
} from "@/components/ui";

interface CreatedClinic {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  defaultLocale: string;
  adminUser?: { email: string; fullName: string } | null;
}

export function CreateClinicForm({
  onCancel,
  onSuccess,
}: {
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [timezone, setTimezone] = useState("Africa/Cairo");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [subscriptionPlanCode, setSubscriptionPlanCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [plans, setPlans] = useState<
    Array<{
      code: string;
      name: string;
      price: string;
      durationDays: number;
      isActive?: boolean;
    }>
  >([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedClinic | null>(null);

  // Determine which field is provided as login
  const adminLogin = useMemo(() => {
    if (adminEmail.trim()) return adminEmail.trim();
    if (adminPhone.trim()) return adminPhone.trim();
    return "";
  }, [adminEmail, adminPhone]);

  useEffect(() => {
    setPlansLoading(true);
    setPlansError(false);
    void fetch("/api/billing/subscription-plans/manage")
      .then(async (res) => {
        if (!res.ok) {
          setPlansError(true);
          return;
        }
        const data = (await res.json()) as Array<{
          isActive?: boolean;
          code: string;
          name: string;
          price: string;
          durationDays: number;
        }>;
        const arr = Array.isArray(data) ? data : [];
        const active = arr.filter((p) => p.isActive !== false);
        setPlans(active);
        if (active.length > 0) setSubscriptionPlanCode(active[0].code);
      })
      .catch(() => setPlansError(true))
      .finally(() => setPlansLoading(false));
  }, []);

  function handleNameChange(val: string) {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 60),
    );
  }

  function formatApiError(data: Record<string, unknown>) {
    if (typeof data.message === "string") return data.message;
    if (Array.isArray(data.message))
      return (data.message as string[]).join(" ");
    return isAr ? "تعذر إنشاء العيادة" : "Failed to create clinic";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);

    // ── Client-side validation for required fields ──
    if (!adminFullName.trim()) {
      setError(
        isAr ? "الاسم الكامل للطبيب مطلوب" : "Doctor full name is required",
      );
      return;
    }
    if (!adminEmail.trim()) {
      setError(isAr ? "اسم مستخدم الطبيب مطلوب" : "Doctor username is required");
      return;
    }
    if (!adminPassword) {
      setError(
        isAr
          ? "كلمة المرور مطلوبة (8 أحرف على الأقل)"
          : "Password is required (min 8 characters)",
      );
      return;
    }
    if (adminPassword.length < 8) {
      setError(
        isAr
          ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
          : "Password must be at least 8 characters",
      );
      return;
    }
    if (!subscriptionPlanCode) {
      setError(
        isAr ? "يجب اختيار باقة اشتراك" : "A subscription plan is required",
      );
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          timezone,
          defaultLocale: locale,
          adminFullName: adminFullName.trim() || undefined,
          adminEmail: adminEmail.trim() || undefined,
          adminPhone: adminPhone.trim() || undefined,
          adminLogin: adminLogin || undefined,
          adminPassword: adminPassword || undefined,
          subscriptionPeriod: subscriptionPlanCode || undefined,
          referralCode: referralCode.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        setError(formatApiError(data));
        return;
      }
      setCreated(data as unknown as CreatedClinic);
      setName("");
      setSlug("");
      setAdminFullName("");
      setAdminEmail("");
      setAdminPhone("");
      setAdminPassword("");
      setReferralCode("");
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">
          {isAr ? "إنشاء عيادة جديدة" : "Create New Clinic"}
        </h2>
        <p className="text-xs text-muted mt-0.5">
          {isAr
            ? "إضافة عيادة جديدة إلى المنصة"
            : "Provision a new tenant on the platform"}
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <Input
            label={isAr ? "اسم العيادة" : "Clinic Name"}
            placeholder={
              isAr ? "مثال: عيادة القاهرة للعيون" : "Cairo Eye Specialists"
            }
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
          <Input
            label={isAr ? "المعرّف (Slug)" : "Slug (URL identifier)"}
            placeholder="cairo-eye-specialists"
            required
            pattern="^[a-z0-9\\-]+$"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            hint={
              isAr
                ? "أحرف صغيرة وأرقام وشرطات فقط"
                : "Lowercase letters, numbers, hyphens only"
            }
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {isAr ? "المنطقة الزمنية" : "Timezone"}
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
            >
              <option value="Africa/Cairo">Africa/Cairo (EET, UTC+2/+3)</option>
              <option value="Asia/Riyadh">Asia/Riyadh (AST, UTC+3)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          {/* Doctor Admin */}
          <div className="border-t border-card-border pt-4 space-y-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              {isAr ? "مدير العيادة (الطبيب)" : "Doctor Admin"}
            </p>
            <Input
              label={isAr ? "الاسم الكامل للمدير" : "Admin Full Name"}
              placeholder={isAr ? "د. اسم المدير" : "Dr. Clinic Owner"}
              required
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
            />

            {/* Email OR Phone - both optional, at least one */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={isAr ? "اسم مستخدم الطبيب" : "Doctor username"}
                placeholder="doctor.name"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                hint={
                  isAr
                    ? "سيتم إنشاء الإيميل تلقائياً: الاسم@clinic.com"
                    : "Email will be created as username@clinic.com"
                }
              />
              <PhoneInput
                label={isAr ? "رقم الهاتف (اختياري)" : "Phone (optional)"}
                value={adminPhone}
                onChange={setAdminPhone}
                placeholder="1000000000"
              />
            </div>
            {adminEmail && adminPhone && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                {isAr
                  ? "سيتم ربط كلا الطريقتين بنفس الحساب"
                  : "Both login methods will be linked to the same account"}
              </div>
            )}

            <Input
              label={isAr ? "كلمة المرور" : "Admin Password"}
              type="password"
              required
              minLength={8}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
          </div>

          {/* Subscription plan */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {isAr ? "باقة الاشتراك الابتدائية" : "Initial Subscription Plan"}
            </label>
            {plansLoading ? (
              <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted animate-pulse">
                {isAr ? "جاري تحميل الباقات..." : "Loading plans..."}
              </div>
            ) : plansError ? (
              <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {isAr ? "تعذّر تحميل الباقات" : "Could not load plans"}
              </div>
            ) : plans.length === 0 ? (
              <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
                {isAr ? "لا توجد باقات متاحة" : "No plans available"}
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {plans.map((plan) => {
                  const selected = subscriptionPlanCode === plan.code;
                  return (
                    <button
                      key={plan.code}
                      type="button"
                      onClick={() => setSubscriptionPlanCode(plan.code)}
                      className={`rounded-lg border px-4 py-3 text-start transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${selected ? "border-primary bg-primary/8 ring-1 ring-primary/30" : "border-border bg-surface hover:border-primary/40"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}
                        >
                          {plan.name}
                        </span>
                        <span
                          className={`text-xs font-semibold tabular-nums ${selected ? "text-primary" : "text-muted"}`}
                        >
                          {plan.price} {isAr ? "ج.م" : "EGP"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {plan.durationDays} {isAr ? "يوم" : "days"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Referral code */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {isAr ? "كود الإحالة (اختياري)" : "Referral Code (optional)"}
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder={
                isAr ? "مثال: cairo-eye-clinic" : "e.g. cairo-eye-clinic"
              }
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
            />
            <p className="text-xs text-muted">
              {isAr
                ? "إذا كان صاحب الكود دكتوراً على المنصة، سيحصل على 10 أيام اشتراك إضافية كمكافأة إحالة."
                : "If the code matches a doctor on the platform, they'll receive 10 bonus subscription days as a referral reward."}
            </p>
          </div>

          {error && <Alert variant="error">{error}</Alert>}
          {created && (
            <Alert variant="success">
              <div>
                <p className="font-medium">
                  {isAr ? "تم إنشاء العيادة!" : "Clinic created!"}
                </p>
                <p className="text-xs mt-0.5 font-mono">{created.slug}</p>
                {created.adminUser && (
                  <p className="text-xs mt-0.5">{created.adminUser.email}</p>
                )}
              </div>
            </Alert>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" loading={pending}>
              {isAr ? "إنشاء العيادة" : "Create Clinic"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
