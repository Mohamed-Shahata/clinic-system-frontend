"use client";

import { getDashboardHref } from "@/lib/auth/dashboard-path";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useState } from "react";
import { Alert } from "@/components/ui";
import { PhoneInput } from "@/components/ui/phone-input";
import Link from "next/link";

// ── نوع وضع تسجيل الدخول ──────────────────────────────────────────────
type LoginMode = "email" | "phone";

export default function LoginPage() {
  const t = useTranslations("login");
  const locale = useLocale();
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";

  // FIX-1: وضع صريح بدل التخمين من قيمة الـ input
  const [loginMode, setLoginMode] = useState<LoginMode>("email");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // عند التبديل بين الوضعين، نصفّر الـ input
  function toggleMode() {
    setLoginMode((prev) => (prev === "email" ? "phone" : "email"));
    setLogin("");
    setError(null);
  }

  function normalizeLogin(value: string) {
    const trimmed = value.trim();
    if (loginMode === "phone") {
      // PhoneInput بيرجع رقم كامل مثل +201234567890
      if (trimmed.startsWith("+")) return trimmed;
      const digits = trimmed.replace(/\D/g, "");
      if (digits.startsWith("20")) return `+${digits}`;
      if (digits.startsWith("0")) return `+20${digits.slice(1)}`;
      return `+20${digits}`;
    }
    return trimmed.toLowerCase();
  }

  // FIX-2: ترجمة أخطاء الـ backend حسب اللغة الحالية
  function translateLoginError(message: unknown): string {
    const text = typeof message === "string" ? message : "";
    const fallback = isAr ? "بيانات الدخول غير صحيحة" : "Invalid credentials";

    // Handle prefixed deactivation errors from backend (format: "code:message")
    if (text.startsWith("account_deactivated:")) {
      const msg = text.replace("account_deactivated:", "").trim();
      return isAr
        ? msg || "تم إلغاء تفعيل حسابك. تواصل مع الدكتور المسؤول."
        : "Your account has been deactivated. Please contact the clinic administrator.";
    }
    if (text.startsWith("clinic_deactivated:")) {
      return isAr
        ? "العيادة موقوفة مؤقتاً. تواصل مع الإدارة."
        : "This clinic is currently suspended. Please contact support.";
    }
    if (text.startsWith("subscription_expired:")) {
      return isAr
        ? "تم انتهاء مدة الباقة الخاصة بك. يرجى تجديد الاشتراك."
        : "Your package has expired. Please renew the subscription.";
    }

    const dictionary: Record<string, { ar: string; en: string }> = {
      "Invalid credentials": {
        ar: "بيانات الدخول غير صحيحة",
        en: "Invalid credentials",
      },
      "No active membership for this clinic": {
        ar: "لا توجد عضوية نشطة لهذا الحساب في هذه العيادة",
        en: "No active membership for this clinic",
      },
      "No clinic membership for this account": {
        ar: "هذا الحساب غير مرتبط بأي عيادة نشطة",
        en: "No clinic membership for this account",
      },
      "This account is linked to multiple clinics. Ask your administrator for your clinic code (clinicSlug).":
        {
          ar: "هذا الحساب مرتبط بأكثر من عيادة. اطلب رمز العيادة من المسؤول.",
          en: "This account is linked to multiple clinics. Ask your administrator for your clinic code.",
        },
      "Session revoked": {
        ar: "تم إنهاء جلستك. سجّل الدخول مجدداً.",
        en: "Your session has been ended. Please log in again.",
      },
    };

    if (dictionary[text]) return dictionary[text][isAr ? "ar" : "en"];

    if (text.startsWith("Cannot reach API")) {
      return isAr
        ? "لا يمكن الاتصال بالخادم. تأكد أن خدمة API تعمل."
        : "Cannot reach the API. Make sure the server is running.";
    }
    if (text.startsWith("Invalid login response")) {
      return isAr
        ? "استجابة تسجيل الدخول من الخادم غير صحيحة."
        : "Invalid login response from server.";
    }
    return text || fallback;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: normalizeLogin(login), password }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        if (
          typeof data.message === "string" &&
          data.message.startsWith("subscription_expired:")
        ) {
          window.location.replace(`/${locale}/renew-subscription`);
          return;
        }
        setError(translateLoginError(data.message));
        return;
      }

      const user = data.user as Record<string, unknown> | undefined;
      if (!user) {
        setError(
          isAr
            ? "استجابة غير متوقعة من الخادم"
            : "Unexpected response from server",
        );
        return;
      }

      const claims = {
        sub: String(user.id ?? ""),
        email: String(user.email ?? ""),
        isSuperAdmin: user.isSuperAdmin === true,
        clinicId: user.clinicId ? String(user.clinicId) : undefined,
        clinicSlug: user.clinicSlug ? String(user.clinicSlug) : undefined,
        clinicName: user.clinicName ? String(user.clinicName) : undefined,
        role: user.role as "DOCTOR_ADMIN" | "RECEPTIONIST" | undefined,
      };

      window.location.replace(getDashboardHref(locale, claims));
    } catch {
      setError(
        isAr
          ? "خطأ في الشبكة — حاول مجددًا"
          : "Network error — please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  // ── الـ labels حسب الوضع واللغة ────────────────────────────────────
  const modeToggleLabel =
    loginMode === "email"
      ? isAr
        ? "تسجيل بالرقم"
        : "Sign in with phone"
      : isAr
        ? "تسجيل بالإيميل"
        : "Sign in with email";

  const inputLabel =
    loginMode === "email"
      ? isAr
        ? "البريد الإلكتروني"
        : "Email address"
      : isAr
        ? "رقم الهاتف"
        : "Phone number";

  const inputPlaceholder =
    loginMode === "email"
      ? isAr
        ? "doctor@clinic.com"
        : "doctor@clinic.com"
      : isAr
        ? "01xxxxxxxxx"
        : "01xxxxxxxxx";

  return (
    <div
      dir={dir}
      className={`min-h-screen bg-background grid lg:grid-cols-[1.1fr_0.9fr]`}
    >
      {/* ── Login form ── */}
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded bg-primary shadow-glow">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted mt-1">{t("subtitle")}</p>
          </div>

          <div className="bg-card border border-card-border rounded-lg shadow-card-md p-6 space-y-4">
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="space-y-4"
              dir={dir}
            >
              {/* ── حقل البريد / الرقم ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    className="block text-sm font-medium text-foreground"
                    htmlFor="login"
                  >
                    {inputLabel}
                  </label>

                  {/* FIX-1: زرار التبديل بين الوضعين */}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors rounded px-2 py-1 hover:bg-primary/8 border border-transparent hover:border-primary/20"
                  >
                    {loginMode === "email" ? (
                      /* أيقونة هاتف */
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          width="14"
                          height="20"
                          x="5"
                          y="2"
                          rx="2"
                          ry="2"
                        />
                        <path d="M12 18h.01" />
                      </svg>
                    ) : (
                      /* أيقونة إيميل */
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    )}
                    {modeToggleLabel}
                  </button>
                </div>

                {/* FIX-1: الـ input يتغير حسب الوضع */}
                {loginMode === "phone" ? (
                  <PhoneInput
                    id="login"
                    value={login}
                    onChange={setLogin}
                    placeholder={inputPlaceholder}
                    locale={locale}
                    required
                  />
                ) : (
                  <input
                    id="login"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={inputPlaceholder}
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none ring-primary/30 focus:ring-2 transition-shadow"
                    dir="ltr"
                  />
                )}
              </div>

              {/* ── كلمة المرور ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    className="block text-sm font-medium text-foreground"
                    htmlFor="password"
                  >
                    {isAr ? "كلمة المرور" : "Password"}
                  </label>
                  <Link
                    href={`/${locale}/forgot-password`}
                    className="text-xs text-primary hover:underline"
                  >
                    {isAr ? "نسيت كلمة المرور؟" : "Forgot password?"}
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none ring-primary/30 focus:ring-2 transition-shadow"
                  dir="ltr"
                />
              </div>

              {/* FIX-2: الأخطاء بالعربي/الإنجليزي */}
              {error && <Alert variant="error">{error}</Alert>}

              <button
                type="submit"
                disabled={pending}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-glow/30"
              >
                {pending ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray="40"
                        strokeDashoffset="20"
                      />
                    </svg>
                    {t("submitting")}
                  </>
                ) : (
                  t("submitButton")
                )}
              </button>
            </form>
          </div>

          <p className="mt-4 text-xs text-muted text-center">
            {isAr
              ? "نظام إدارة عيادة · منصة آمنة"
              : "Clinic Management SaaS · Secure multi-tenant platform"}
          </p>
        </div>
      </section>

      <section className="hidden lg:flex flex-col justify-between text-white relative overflow-hidden">
        {/* Background image — fills full panel */}
        <img
          src="/auth-doctor.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          aria-hidden="true"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/20" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10 p-10">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <p className="font-semibold">
            {isAr ? "نظام إدارة العيادة" : "Clinic CMS"}
          </p>
        </div>

        {/* نص جانبي */}
        <div className="max-w-lg relative z-10 p-10 pb-6">
          <h1 className="text-4xl font-semibold leading-tight">
            {isAr
              ? "طريقة أهدأ لإدارة العيادات والمرضى والحسابات."
              : "A quieter way to run clinics, doctors, patients, and billing."}
          </h1>
          <p className="mt-4 text-sm text-sidebar-fg">
            {isAr
              ? "وصول آمن للأطباء وفرق الاستقبال."
              : "Secure access for clinic admins, doctors, and reception teams."}
          </p>
        </div>

        <p className="text-xs text-white/60 relative z-10 px-10 pb-10">
          {isAr ? "نظام إدارة عيادة متكامل" : "Multi-tenant clinic operations"}
        </p>
      </section>
    </div>
  );
}
