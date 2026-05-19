"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Alert } from "@/components/ui";

type Plan = { id: string; name: string; price: string; durationDays: number };

export default function RenewSubscriptionPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [login, setLogin] = useState("");
  const [clinicSlug, setClinicSlug] = useState("");
  const [transferPhone, setTransferPhone] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void fetch("/api/billing/subscription-plans", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: Plan[]) => {
        const nextPlans = Array.isArray(data) ? data : [];
        setPlans(nextPlans);
        setPlanId(nextPlans[0]?.id ?? "");
      })
      .catch(() => setPlans([]));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      if (!screenshotFile) {
        setError(isAr ? "يرجى رفع صورة التحويل" : "Please upload the payment screenshot");
        return;
      }
      const formData = new FormData();
      formData.append("file", screenshotFile);
      const uploadRes = await fetch("/api/upload/payment-proof", {
        method: "POST",
        body: formData,
      });
      const uploadData = (await uploadRes.json().catch(() => ({}))) as {
        url?: string;
        message?: string;
      };
      if (!uploadRes.ok || !uploadData.url) {
        setError(
          uploadData.message ||
            (isAr ? "تعذر رفع صورة التحويل" : "Could not upload screenshot"),
        );
        return;
      }
      const res = await fetch("/api/billing/public/subscription-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: login.trim(),
          clinicSlug: clinicSlug.trim() || undefined,
          planId,
          transferPhone: transferPhone.trim(),
          screenshotUrl: uploadData.url,
          notes: notes.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(
          data.message ||
            (isAr ? "تعذر إرسال طلب التجديد" : "Could not submit renewal"),
        );
        return;
      }
      setMessage(
        isAr
          ? "تم إرسال طلب التجديد بنجاح. سيتم مراجعته من مدير المنصة."
          : "Renewal request sent. The platform admin will review it.",
      );
      setTransferPhone("");
      setScreenshotFile(null);
      setNotes("");
    } finally {
      setPending(false);
    }
  }

  return (
    <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-background p-6">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-lg items-center">
        <div className="w-full rounded-lg border border-card-border bg-card p-6 shadow-card-md">
          <h1 className="text-2xl font-semibold text-foreground">
            {isAr ? "تجديد اشتراك العيادة" : "Renew Clinic Subscription"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {isAr
              ? "تم انتهاء مدة الباقة الخاصة بك. أرسل بيانات التحويل ليتم تفعيل العيادة بعد المراجعة."
              : "Your package has expired. Send transfer details so the clinic can be reactivated after review."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              placeholder={isAr ? "إيميل أو رقم الدكتور المسؤول" : "Admin doctor email or phone"}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              value={clinicSlug}
              onChange={(e) => setClinicSlug(e.target.value)}
              placeholder={isAr ? "كود العيادة عند الحاجة" : "Clinic code if needed"}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {plan.price} / {plan.durationDays}{" "}
                  {isAr ? "يوم" : "days"}
                </option>
              ))}
            </select>
            <input
              value={transferPhone}
              onChange={(e) => setTransferPhone(e.target.value)}
              required
              placeholder={isAr ? "الرقم الذي تم التحويل منه" : "Transfer phone number"}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
              required
              type="file"
              accept="image/*"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? "ملاحظات اختيارية" : "Optional notes"}
              className="min-h-24 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            {error ? <Alert variant="error">{error}</Alert> : null}
            {message ? <Alert variant="success">{message}</Alert> : null}
            <button
              type="submit"
              disabled={pending || !planId}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg disabled:opacity-50"
            >
              {pending
                ? isAr
                  ? "جار الإرسال..."
                  : "Submitting..."
                : isAr
                  ? "إرسال طلب التجديد"
                  : "Submit renewal request"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
