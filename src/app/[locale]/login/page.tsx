"use client";

import { getDashboardHref } from "@/lib/auth/dashboard-path";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useState } from "react";
import { Alert } from "@/components/ui";
import Link from "next/link";

export default function LoginPage() {
  const t = useTranslations("login");
  const locale = useLocale();
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function normalizeLogin(value: string) {
    const trimmed = value.trim();
    if (/^[0-9+\s()-]+$/.test(trimmed)) {
      const digits = trimmed.replace(/\D/g, "");
      if (digits.startsWith("20")) return `+${digits}`;
      if (digits.startsWith("0")) return `+20${digits.slice(1)}`;
      if (digits.startsWith("+")) return trimmed;
      return `+20${digits}`;
    }
    return trimmed;
  }

  function handleLoginChange(value: string) {
    if (/^[0-9+\s()-]+$/.test(value) && value.trim().length > 0) {
      const digits = value.replace(/\D/g, "");
      if (digits.startsWith("20")) setEmail(`+${digits}`);
      else if (digits.startsWith("0")) setEmail(`+20${digits.slice(1)}`);
      else if (value.startsWith("+")) setEmail(value);
      else setEmail(`+20${digits}`);
      return;
    }
    setEmail(value);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: normalizeLogin(email), password }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : isAr
              ? "بيانات الدخول غير صحيحة"
              : "Invalid credentials",
        );
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

  return (
    <div
      dir={dir}
      className="min-h-screen bg-background grid lg:grid-cols-[1.1fr_0.9fr]"
    >
      {/* ── Side panel ── */}
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

        {/* Doctor illustration */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <svg
            viewBox="0 0 300 400"
            className="w-72 h-96 text-white fill-current"
          >
            {/* Body */}
            <ellipse cx="150" cy="320" rx="75" ry="55" />
            {/* Lab coat */}
            <path d="M85 250 Q75 330 90 370 L135 370 L150 300 L165 370 L210 370 Q225 330 215 250 Q190 240 150 240 Q110 240 85 250Z" />
            {/* White coat detail */}
            <path d="M140 250 L150 300 L160 250" fill="rgba(0,0,0,0.15)" />
            {/* Stethoscope */}
            <path
              d="M120 270 Q115 295 130 300 Q145 305 145 320"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="4"
              fill="none"
            />
            <circle cx="145" cy="322" r="5" fill="rgba(0,0,0,0.3)" />
            {/* Head */}
            <circle cx="150" cy="130" r="55" />
            {/* Neck */}
            <rect x="133" y="180" width="34" height="30" rx="10" />
            {/* Face features */}
            <circle cx="135" cy="122" r="5" fill="rgba(0,0,0,0.2)" />
            <circle cx="165" cy="122" r="5" fill="rgba(0,0,0,0.2)" />
            <path
              d="M138 148 Q150 158 162 148"
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Medical cross */}
            <rect
              x="192"
              y="280"
              width="8"
              height="24"
              rx="2"
              fill="rgba(255,255,255,0.4)"
            />
            <rect
              x="186"
              y="286"
              width="20"
              height="8"
              rx="2"
              fill="rgba(255,255,255,0.4)"
            />
          </svg>
        </div>

        {/* Text */}
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
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-foreground"
                  htmlFor="email"
                >
                  {t("loginLabel")}
                </label>
                <input
                  id="email"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder={t("loginPlaceholder")}
                  value={email}
                  onChange={(e) => handleLoginChange(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none ring-primary/30 focus:ring-2 transition-shadow"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    className="block text-sm font-medium text-foreground"
                    htmlFor="password"
                  >
                    {t("passwordLabel")}
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
    </div>
  );
}
