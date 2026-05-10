"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui";

export function DoctorPaymentForm({
  userId,
  initialConsultationFee,
  initialFollowUpFee,
}: {
  userId: string;
  initialConsultationFee?: string | number | null;
  initialFollowUpFee?: string | number | null;
}) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [mode] = useState("FIXED_RENT");
  const [consultationFee, setConsultationFee] = useState(
    initialConsultationFee ? String(initialConsultationFee) : "300",
  );
  const [followUpFee, setFollowUpFee] = useState(
    initialFollowUpFee ? String(initialFollowUpFee) : "150",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const res = await fetch(`/api/users/doctors/${userId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMode: mode,
        fixedMonthlyRent: 0,
        adminPercentage: undefined,
        consultationFee: Number(consultationFee || 0),
        followUpFee: Number(followUpFee || 0),
      }),
    });
    setIsSuccess(res.ok);
    setMessage(
      res.ok
        ? isAr
          ? "تم حفظ سياسة الدفع"
          : "Payment policy saved"
        : isAr
          ? "تعذر حفظ سياسة الدفع"
          : "Could not save payment policy",
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <p className="text-xs text-muted">
        {isAr ? "اضبط الأسعار الافتراضية عند إنشاء الفاتورة." : "Set the default prices used when creating invoices."}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-muted">
          <span>{isAr ? "سعر الكشف" : "Consultation fee"}</span>
          <input
            value={consultationFee}
            onChange={(e) => setConsultationFee(e.target.value)}
            type="number"
            min="0"
            className="h-9 w-full rounded border border-border bg-surface px-2 text-sm text-foreground"
          />
        </label>
        <label className="space-y-1 text-xs text-muted">
          <span>{isAr ? "سعر المتابعة" : "Follow-up fee"}</span>
          <input
            value={followUpFee}
            onChange={(e) => setFollowUpFee(e.target.value)}
            type="number"
            min="0"
            className="h-9 w-full rounded border border-border bg-surface px-2 text-sm text-foreground"
          />
        </label>
      </div>
      <Button type="submit" size="sm" variant="secondary">
        {isAr ? "حفظ" : "Save"}
      </Button>
      {message && (
        <span
          className={`text-xs ${isSuccess ? "text-success" : "text-danger"}`}
        >
          {message}
        </span>
      )}
    </form>
  );
}
