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

      <section className="hidden lg:flex flex-col justify-between bg-sidebar p-10 text-white relative overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
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

        {/* FIX-4: رسم طبيب احترافي جديد ── */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            viewBox="0 0 420 500"
            className="w-80 h-96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* ── خلفية دائرة ناعمة ── */}
            <circle cx="210" cy="240" r="180" fill="rgba(255,255,255,0.04)" />
            <circle cx="210" cy="240" r="130" fill="rgba(255,255,255,0.04)" />

            {/* ── الرأس ── */}
            <ellipse
              cx="210"
              cy="108"
              rx="46"
              ry="52"
              fill="rgba(255,255,255,0.18)"
            />
            {/* الشعر */}
            <path
              d="M164 95 Q168 60 210 58 Q252 60 256 95 Q248 72 210 70 Q172 72 164 95Z"
              fill="rgba(255,255,255,0.28)"
            />
            {/* الرقبة */}
            <rect
              x="196"
              y="156"
              width="28"
              height="28"
              rx="8"
              fill="rgba(255,255,255,0.16)"
            />

            {/* ── الجسم — معطف أبيض ── */}
            <path
              d="M148 184 Q138 200 135 280 L145 380 L185 380 L210 310 L235 380 L275 380 L285 280 Q282 200 272 184 Q248 174 210 174 Q172 174 148 184Z"
              fill="rgba(255,255,255,0.14)"
            />
            {/* طوق المعطف */}
            <path
              d="M196 174 L200 230 L210 250 L220 230 L224 174"
              fill="rgba(255,255,255,0.10)"
              stroke="rgba(255,255,255,0.20)"
              strokeWidth="1"
            />
            {/* زر المعطف */}
            <circle cx="210" cy="265" r="3.5" fill="rgba(255,255,255,0.25)" />
            <circle cx="210" cy="285" r="3.5" fill="rgba(255,255,255,0.25)" />
            <circle cx="210" cy="305" r="3.5" fill="rgba(255,255,255,0.25)" />

            {/* ── الكتفين والذراعين ── */}
            {/* ذراع يسار */}
            <path
              d="M148 188 Q120 200 112 245 Q108 270 118 290 L130 290 Q122 268 126 248 Q133 215 152 205Z"
              fill="rgba(255,255,255,0.14)"
            />
            {/* ذراع يمين */}
            <path
              d="M272 188 Q300 200 308 245 Q312 270 302 290 L290 290 Q298 268 294 248 Q287 215 268 205Z"
              fill="rgba(255,255,255,0.14)"
            />
            {/* اليد اليسرى */}
            <ellipse
              cx="124"
              cy="297"
              rx="10"
              ry="12"
              fill="rgba(255,255,255,0.16)"
            />
            {/* اليد اليمنى تمسك ملف طبي */}
            <ellipse
              cx="296"
              cy="297"
              rx="10"
              ry="12"
              fill="rgba(255,255,255,0.16)"
            />

            {/* ── ملف طبي في اليد اليمنى ── */}
            <rect
              x="302"
              y="270"
              width="34"
              height="44"
              rx="4"
              fill="rgba(255,255,255,0.20)"
              stroke="rgba(255,255,255,0.30)"
              strokeWidth="1"
            />
            <rect
              x="306"
              y="278"
              width="22"
              height="2.5"
              rx="1"
              fill="rgba(255,255,255,0.40)"
            />
            <rect
              x="306"
              y="285"
              width="18"
              height="2.5"
              rx="1"
              fill="rgba(255,255,255,0.30)"
            />
            <rect
              x="306"
              y="292"
              width="20"
              height="2.5"
              rx="1"
              fill="rgba(255,255,255,0.30)"
            />
            <rect
              x="306"
              y="299"
              width="14"
              height="2.5"
              rx="1"
              fill="rgba(255,255,255,0.20)"
            />
            {/* كليب الملف */}
            <rect
              x="313"
              y="265"
              width="12"
              height="8"
              rx="3"
              fill="rgba(255,255,255,0.30)"
            />

            {/* ── سماعة الطبيب (ستيثوسكوب) ── */}
            <path
              d="M172 200 Q162 215 158 235 Q155 255 162 265 Q172 278 185 275 Q198 272 200 260"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* الجزء الدائري للسماعة */}
            <circle
              cx="162"
              cy="268"
              r="8"
              fill="rgba(255,255,255,0.22)"
              stroke="rgba(255,255,255,0.38)"
              strokeWidth="2"
            />
            <circle cx="162" cy="268" r="4" fill="rgba(255,255,255,0.35)" />
            {/* سماعة الأذن */}
            <path
              d="M172 200 Q178 195 184 198"
              stroke="rgba(255,255,255,0.30)"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="184" cy="198" r="4" fill="rgba(255,255,255,0.28)" />

            {/* ── صليب طبي ── */}
            <rect
              x="74"
              y="155"
              width="10"
              height="30"
              rx="3"
              fill="rgba(255,255,255,0.30)"
            />
            <rect
              x="64"
              y="165"
              width="30"
              height="10"
              rx="3"
              fill="rgba(255,255,255,0.30)"
            />

            {/* ── نبضات قلب في الخلفية ── */}
            <polyline
              points="30,350 55,350 65,330 75,370 88,340 100,355 120,355"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <polyline
              points="300,420 325,420 335,400 345,440 358,410 370,425 390,425"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* ── عيون ── */}
            <ellipse
              cx="196"
              cy="104"
              rx="5"
              ry="6"
              fill="rgba(255,255,255,0.30)"
            />
            <ellipse
              cx="224"
              cy="104"
              rx="5"
              ry="6"
              fill="rgba(255,255,255,0.30)"
            />
            <ellipse
              cx="196"
              cy="105"
              rx="2.5"
              ry="3"
              fill="rgba(255,255,255,0.55)"
            />
            <ellipse
              cx="224"
              cy="105"
              rx="2.5"
              ry="3"
              fill="rgba(255,255,255,0.55)"
            />

            {/* ── ابتسامة ── */}
            <path
              d="M198 128 Q210 138 222 128"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        {/* نص جانبي */}
        <div className="max-w-lg relative z-10">
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

        <p className="text-xs text-sidebar-fg relative z-10">
          {isAr ? "نظام إدارة عيادة متكامل" : "Multi-tenant clinic operations"}
        </p>
      </section>
    </div>
  );
}
