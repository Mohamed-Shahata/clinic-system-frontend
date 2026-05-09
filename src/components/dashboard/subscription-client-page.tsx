"use client";

import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader } from "@/components/ui";
import { Toast } from "@/components/ui/toast";

type Plan = {
  id: string;
  name: string;
  price: string;
  durationDays: number;
  description?: string;
  features?: string[];
};

type Subscription = {
  id: string;
  plan: Plan;
  startsAt: string;
  expiresAt: string;
  status: string;
};

interface Props {
  locale: string;
  initialSubscription: Subscription | null;
  plans: Plan[];
}

export function SubscriptionClientPage({
  locale,
  initialSubscription,
  plans,
}: Props) {
  const isAr = locale === "ar";
  const router = useRouter();

  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const [transferPhone, setTransferPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subscription = initialSubscription;
  const isExpired =
    subscription && new Date(subscription.expiresAt) < new Date();

  const daysLeft = subscription
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.expiresAt).getTime() - Date.now()) / 86400000,
        ),
      )
    : 0;

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }

  async function uploadImage(): Promise<string> {
    if (!imageFile) throw new Error("No image selected");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", imageFile);
    fd.append("folder", "payment-proofs");
    const res = await fetch("/api/upload?folder=payment-proofs", {
      method: "POST",
      body: fd,
    });
    const data = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    setUploading(false);
    if (!res.ok || !data.url) {
      throw new Error(
        typeof data.message === "string"
          ? data.message
          : isAr
            ? "فشل رفع الصورة"
            : "Image upload failed",
      );
    }
    return data.url as string;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlanId) {
      showToast(
        isAr ? "اختر باقة أولاً" : "Please select a plan first",
        "error",
      );
      return;
    }
    if (!transferPhone.trim()) {
      showToast(
        isAr ? "يرجى إدخال رقم هاتف التحويل" : "Please enter the transfer phone number",
        "error",
      );
      return;
    }
    if (!imageFile) {
      showToast(
        isAr ? "يرجى رفع صورة التحويل" : "Please upload a payment screenshot",
        "error",
      );
      return;
    }

    setSubmitting(true);
    try {
      const screenshotUrl = await uploadImage();

      const res = await fetch("/api/billing/subscription-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          transferPhone: transferPhone.trim(),
          screenshotUrl,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(
          typeof (data as Record<string, unknown>).message === "string"
            ? ((data as Record<string, unknown>).message as string)
            : isAr
              ? "حدث خطأ أثناء إرسال الطلب"
              : "Failed to submit request",
          "error",
        );
        return;
      }

      showToast(
        isAr
          ? "✓ تم إرسال طلب الدفع بنجاح. سيتم المراجعة قريباً."
          : "✓ Payment request submitted successfully. We'll review it soon.",
        "success",
      );
      setTransferPhone("");
      setNotes("");
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : isAr
            ? "حدث خطأ غير متوقع"
            : "Unexpected error",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "اشتراك العيادة" : "Clinic Subscription"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr
            ? "إدارة باقة اشتراك العيادة وتجديد الاشتراك"
            : "Manage your clinic's subscription plan and renewals"}
        </p>
      </div>

      {/* Current Subscription Card */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "الاشتراك الحالي" : "Current Subscription"}
          </h2>
        </CardHeader>
        <CardBody>
          {subscription ? (
            <div className="space-y-4">
              {/* Status banner */}
              <div
                className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
                  isExpired
                    ? "bg-danger/8 border border-danger/20"
                    : daysLeft <= 7
                      ? "bg-warning/8 border border-warning/20"
                      : "bg-success/8 border border-success/20"
                }`}
              >
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      isExpired
                        ? "text-danger"
                        : daysLeft <= 7
                          ? "text-warning"
                          : "text-success"
                    }`}
                  >
                    {isExpired
                      ? isAr
                        ? "⚠ انتهى الاشتراك"
                        : "⚠ Subscription Expired"
                      : daysLeft <= 7
                        ? isAr
                          ? `⏳ الاشتراك ينتهي خلال ${daysLeft} يوم`
                          : `⏳ Expires in ${daysLeft} days`
                        : isAr
                          ? `✓ الاشتراك نشط — متبقي ${daysLeft} يوم`
                          : `✓ Active — ${daysLeft} days remaining`}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {subscription.plan.name} · {isAr ? "ينتهي" : "Expires"}{" "}
                    {new Date(subscription.expiresAt).toLocaleDateString(
                      isAr ? "ar-EG" : "en-GB",
                    )}
                  </p>
                </div>
                <Badge variant={isExpired ? "danger" : "success"}>
                  {isExpired
                    ? isAr
                      ? "منتهي"
                      : "Expired"
                    : isAr
                      ? "نشط"
                      : "Active"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: isAr ? "الباقة" : "Plan",
                    value: subscription.plan.name,
                  },
                  {
                    label: isAr ? "السعر" : "Price",
                    value: `${subscription.plan.price} EGP`,
                  },
                  {
                    label: isAr ? "تاريخ البداية" : "Start Date",
                    value: new Date(subscription.startsAt).toLocaleDateString(
                      isAr ? "ar-EG" : "en-GB",
                    ),
                  },
                  {
                    label: isAr ? "تاريخ الانتهاء" : "End Date",
                    value: new Date(subscription.expiresAt).toLocaleDateString(
                      isAr ? "ar-EG" : "en-GB",
                    ),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-card-border bg-surface-2/50 px-3 py-2.5"
                  >
                    <p className="text-xs text-muted">{item.label}</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted py-2">
              {isAr ? "لا يوجد اشتراك نشط." : "No active subscription found."}
            </p>
          )}
        </CardBody>
      </Card>

      {/* Renewal Form */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "تجديد الاشتراك" : "Renew Subscription"}
          </h2>
          <p className="text-xs text-muted mt-1">
            {isAr
              ? "اختر الباقة وأرسل إيصال التحويل عبر فودافون كاش"
              : "Choose a plan and send your Vodafone Cash transfer receipt"}
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            {/* Plan Cards */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                {isAr ? "اختر الباقة" : "Choose a Plan"}
              </label>
              {plans.length === 0 ? (
                <p className="text-sm text-muted">
                  {isAr ? "لا توجد باقات متاحة" : "No plans available"}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {plans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const perMonth =
                      plan.durationDays >= 28
                        ? Math.round(
                            (parseFloat(plan.price) /
                              (plan.durationDays / 30)) *
                              10,
                          ) / 10
                        : null;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`relative text-start rounded-xl border-2 p-4 transition-all focus:outline-none ${
                          isSelected
                            ? "border-primary bg-primary/6 ring-1 ring-primary/25 shadow-sm"
                            : "border-border bg-surface hover:border-primary/40 hover:bg-surface-2/60"
                        }`}
                      >
                        {/* Selected check */}
                        {isSelected && (
                          <div className="absolute top-3 end-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 12 12"
                              fill="none"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="2 6 5 9 10 3" />
                            </svg>
                          </div>
                        )}

                        <p
                          className={`text-sm font-bold ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {plan.name}
                        </p>
                        <p className="mt-2 text-2xl font-extrabold text-foreground">
                          {plan.price}
                          <span className="text-sm font-medium text-muted ms-1">
                            EGP
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {plan.durationDays} {isAr ? "يوم" : "days"}
                          {perMonth
                            ? ` · ${perMonth} EGP/${isAr ? "شهر" : "mo"}`
                            : ""}
                        </p>
                        {plan.description && (
                          <p className="mt-2 text-xs text-muted leading-relaxed">
                            {plan.description}
                          </p>
                        )}
                        {plan.features && plan.features.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {plan.features.map((f) => (
                              <li
                                key={f}
                                className="flex items-center gap-1.5 text-xs text-foreground/80"
                              >
                                <span className="text-success">✓</span>
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Transfer phone */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {isAr
                  ? "رقم هاتف التحويل"
                  : "Transfer Phone Number"}
                <span className="ms-1 text-danger">*</span>
              </label>
              <input
                type="tel"
                required
                value={transferPhone}
                onChange={(e) => setTransferPhone(e.target.value)}
                placeholder={isAr ? "01xxxxxxxxx" : "01234567890"}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              />
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {isAr ? "صورة إيصال التحويل" : "Payment Transfer Receipt"}
                <span className="ms-1 text-danger">*</span>
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all ${
                  imagePreview
                    ? "border-primary/30 bg-primary/3"
                    : "border-border hover:border-primary/50 hover:bg-surface-2/50"
                }`}
              >
                {imagePreview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="mx-auto max-h-56 rounded-xl object-contain p-3"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-xs font-medium text-white">
                        {isAr ? "تغيير الصورة" : "Change image"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-10 px-4">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-muted"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <p className="text-sm text-muted text-center">
                      {isAr
                        ? "اضغط لرفع صورة الإيصال"
                        : "Click to upload receipt image"}
                    </p>
                    <p className="text-xs text-muted/70">
                      JPG, PNG, WebP — {isAr ? "حتى" : "up to"} 5MB
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  isAr ? "أي ملاحظات إضافية..." : "Any additional notes..."
                }
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2 resize-none"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={submitting || uploading}
              disabled={submitting || uploading}
            >
              {uploading
                ? isAr
                  ? "جارٍ رفع الصورة..."
                  : "Uploading image..."
                : submitting
                  ? isAr
                    ? "جارٍ إرسال الطلب..."
                    : "Submitting..."
                  : isAr
                    ? "إرسال طلب الدفع"
                    : "Submit Payment Request"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
