"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui";

export function DoctorPaymentForm({ userId }: { userId: string }) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [mode, setMode] = useState("FIXED_RENT");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const res = await fetch(`/api/users/doctors/${userId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMode: mode,
        fixedMonthlyRent:
          mode === "FIXED_RENT" ? Number(amount || 0) : undefined,
        adminPercentage:
          mode === "PERCENTAGE" ? Number(amount || 0) : undefined,
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
    <form
      onSubmit={(e) => void submit(e)}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-xs text-muted">
        {isAr ? "سياسة دفع العيادة" : "Clinic payment policy"}
      </span>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="h-8 rounded border border-border bg-surface px-2 text-xs"
      >
        <option value="FIXED_RENT">{isAr ? "إيجار ثابت" : "Fixed rent"}</option>
        <option value="PERCENTAGE">{isAr ? "% نسبة" : "Percentage"}</option>
      </select>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={mode === "FIXED_RENT" ? (isAr ? "الإيجار" : "Rent") : "%"}
        className="h-8 w-20 rounded border border-border bg-surface px-2 text-xs"
      />
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
