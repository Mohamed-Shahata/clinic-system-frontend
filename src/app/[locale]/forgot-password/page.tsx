"use client";

import { useLocale } from "next-intl";
import { FormEvent, useState } from "react";
import { Alert } from "@/components/ui";
import Link from "next/link";

type Step = "request" | "reset" | "done";

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as Record<string,unknown>;
        setError(typeof d.message === "string" ? d.message : isAr ? "حدث خطأ" : "An error occurred");
        return;
      }
      setStep("reset");
    } finally {
      setPending(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code, newPassword }),
      });
      const d = await res.json().catch(() => ({})) as Record<string,unknown>;
      if (!res.ok) {
        setError(typeof d.message === "string" ? d.message : isAr ? "الكود غير صحيح أو منتهي الصلاحية" : "Invalid or expired code");
        return;
      }
      setStep("done");
    } finally {
      setPending(false);
    }
  }

  return (
    <div dir={dir} className="min-h-screen bg-background grid lg:grid-cols-[1.1fr_0.9fr]">
      {/* Side panel */}
      <section className="hidden lg:flex flex-col justify-between bg-sidebar p-10 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <p className="font-semibold">{isAr ? "نظام إدارة العيادة" : "Clinic CMS"}</p>
        </div>
        <div className="max-w-lg">
          <h1 className="text-4xl font-semibold leading-tight">
            {isAr ? "إعادة تعيين كلمة المرور" : "Reset your password"}
          </h1>
          <p className="mt-4 text-sm text-sidebar-fg">
            {isAr ? "سنرسل لك كود التحقق على بريدك الإلكتروني." : "We'll send a verification code to your email."}
          </p>
        </div>
        <p className="text-xs text-sidebar-fg">{isAr ? "نظام إدارة عيادة متكامل" : "Multi-tenant clinic operations"}</p>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded bg-primary shadow-glow">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {isAr ? "نسيت كلمة المرور؟" : "Forgot Password?"}
            </h1>
            <p className="text-sm text-muted mt-1">
              {step === "request"
                ? isAr ? "أدخل بريدك الإلكتروني لاستلام كود التحقق" : "Enter your email to receive a reset code"
                : step === "reset"
                ? isAr ? "أدخل الكود الذي وصلك وكلمة المرور الجديدة" : "Enter the code you received and your new password"
                : isAr ? "تم إعادة تعيين كلمة المرور بنجاح" : "Password reset successfully"}
            </p>
          </div>

          <div className="bg-card border border-card-border rounded-lg shadow-card-md p-6 space-y-4">
            {step === "done" ? (
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-foreground font-medium">
                  {isAr ? "تم تغيير كلمة المرور بنجاح!" : "Password changed successfully!"}
                </p>
                <Link
                  href={`/${locale}/login`}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg hover:opacity-90 transition-opacity"
                >
                  {isAr ? "تسجيل الدخول" : "Sign In"}
                </Link>
              </div>
            ) : step === "request" ? (
              <form onSubmit={(e) => void handleRequest(e)} className="space-y-4" dir={dir}>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    {isAr ? "البريد الإلكتروني" : "Email address"}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isAr ? "your@email.com" : "your@email.com"}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none ring-primary/30 focus:ring-2 transition-shadow"
                    dir="ltr"
                  />
                </div>
                {error && <Alert variant="error">{error}</Alert>}
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {pending ? (
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="20" />
                    </svg>
                  ) : null}
                  {isAr ? "إرسال كود التحقق" : "Send Reset Code"}
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => void handleReset(e)} className="space-y-4" dir={dir}>
                <Alert variant="success">
                  {isAr ? `تم إرسال الكود إلى ${email}` : `Code sent to ${email}`}
                </Alert>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    {isAr ? "كود التحقق (6 أرقام)" : "Verification Code (6 digits)"}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    minLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none ring-primary/30 focus:ring-2 transition-shadow text-center tracking-widest text-lg font-mono"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    {isAr ? "كلمة المرور الجديدة" : "New Password"}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none ring-primary/30 focus:ring-2 transition-shadow"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">
                    {isAr ? "تأكيد كلمة المرور" : "Confirm Password"}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none ring-primary/30 focus:ring-2 transition-shadow"
                    dir="ltr"
                  />
                </div>
                {error && <Alert variant="error">{error}</Alert>}
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {pending ? (
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="20" />
                    </svg>
                  ) : null}
                  {isAr ? "إعادة تعيين كلمة المرور" : "Reset Password"}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep("request"); setError(null); }}
                  className="w-full text-sm text-muted hover:text-foreground transition-colors text-center"
                >
                  {isAr ? "← تغيير البريد الإلكتروني" : "← Change email"}
                </button>
              </form>
            )}
          </div>

          <p className="mt-4 text-center">
            <Link href={`/${locale}/login`} className="text-sm text-primary hover:underline">
              {isAr ? "← العودة لتسجيل الدخول" : "← Back to login"}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
