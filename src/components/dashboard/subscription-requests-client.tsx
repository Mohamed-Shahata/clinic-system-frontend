"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader, Modal } from "@/components/ui";
import type { SubscriptionRequest } from "@/app/[locale]/(dashboard)/dashboard/super-admin/subscription-requests/page";

interface Props {
  locale: string;
  initialRequests: SubscriptionRequest[];
  currentStatus?: string;
}

export function SubscriptionRequestsClient({
  locale,
  initialRequests,
  currentStatus,
}: Props) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requests, setRequests] = useState(initialRequests);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [confirmReview, setConfirmReview] = useState<{
    requestId: string;
    approved: boolean;
  } | null>(null);

  function formatDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const parts = new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-GB", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: isAr,
      timeZone: "Africa/Cairo",
    }).formatToParts(date);

    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const datePart = `${byType.day}/${byType.month}/${byType.year}`;
    const timePart = isAr
      ? `${byType.hour}:${byType.minute}:${byType.second} ${byType.dayPeriod ?? ""}`.trim()
      : `${byType.hour}:${byType.minute}:${byType.second}`;

    return `${datePart} ${timePart}`;
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleReview(requestId: string, approved: boolean) {
    const reason = rejectionReasons[requestId]?.trim();
    if (!approved && !reason) {
      showToast(isAr ? "يرجى كتابة سبب الرفض أولاً" : "Please enter a rejection reason first", false);
      return;
    }

    setReviewing(requestId);
    try {
      const res = await fetch(
        `/api/billing/subscription-requests/${requestId}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approved, rejectionReason: approved ? undefined : reason }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        showToast(
          typeof data.message === "string"
            ? data.message
            : isAr ? "فشلت العملية" : "Operation failed",
          false,
        );
        return;
      }

      // Optimistic update
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: approved ? "APPROVED" : "REJECTED",
                rejectionReason: approved ? null : (reason ?? null),
                reviewedAt: new Date().toISOString(),
              }
            : r,
        ),
      );

      showToast(
        approved
          ? isAr ? "✓ تم قبول الطلب بنجاح" : "✓ Request approved"
          : isAr ? "✓ تم رفض الطلب" : "✓ Request rejected",
        true,
      );

      startTransition(() => router.refresh());
      setConfirmReview(null);
    } catch {
      showToast(isAr ? "حدث خطأ" : "Unexpected error", false);
    } finally {
      setReviewing(null);
    }
  }

  const statusLabel = (s: string) => {
    const map: Record<string, [string, string]> = {
      PENDING:  ["قيد الانتظار", "Pending"],
      APPROVED: ["موافق عليه",   "Approved"],
      REJECTED: ["مرفوض",        "Rejected"],
    };
    return (map[s] ?? [s, s])[isAr ? 0 : 1];
  };

  const statusVariant = (s: string) =>
    s === "PENDING" ? "warning" : s === "APPROVED" ? "success" : "danger";

  const filterTabs = [
    { key: undefined, ar: "الكل", en: "All" },
    { key: "PENDING",  ar: "قيد الانتظار", en: "Pending" },
    { key: "APPROVED", ar: "موافق عليه",   en: "Approved" },
    { key: "REJECTED", ar: "مرفوض",        en: "Rejected" },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 inset-x-4 sm:inset-x-auto sm:end-4 sm:w-96 z-[999] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
            toast.ok
              ? "bg-success/10 border-success/30 text-success"
              : "bg-danger/10 border-danger/30 text-danger"
          }`}
        >
          <p className="flex-1 text-sm font-medium">{toast.msg}</p>
        </div>
      )}

      {/* Expanded image lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedImage}
            alt="receipt"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 end-4 h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            ✕
          </button>
        </div>
      )}

      <Modal
        open={Boolean(confirmReview)}
        title={
          confirmReview?.approved
            ? isAr ? "تأكيد قبول الطلب" : "Confirm Approval"
            : isAr ? "تأكيد رفض الطلب" : "Confirm Rejection"
        }
        description={
          confirmReview?.approved
            ? isAr
              ? "سيتم تفعيل/تمديد اشتراك العيادة حسب الباقة المختارة."
              : "The clinic subscription will be activated or extended using the selected plan."
            : isAr
              ? "سيتم إرسال نتيجة الرفض للعيادة مع سبب الرفض."
              : "The clinic will be notified with the rejection reason."
        }
        onClose={() => setConfirmReview(null)}
        closeLabel={isAr ? "إغلاق" : "Close"}
        className="max-w-md"
      >
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmReview(null)}
            className="w-full sm:w-auto"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            type="button"
            variant={confirmReview?.approved ? "primary" : "danger"}
            loading={confirmReview ? reviewing === confirmReview.requestId : false}
            disabled={isPending || !confirmReview}
            className="w-full sm:w-auto"
            onClick={() => {
              if (!confirmReview) return;
              void handleReview(confirmReview.requestId, confirmReview.approved);
            }}
          >
            {confirmReview?.approved
              ? isAr ? "تأكيد القبول" : "Approve"
              : isAr ? "تأكيد الرفض" : "Reject"}
          </Button>
        </div>
      </Modal>

      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "طلبات تجديد الاشتراك" : "Subscription Requests"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr ? "مراجعة وقبول طلبات تجديد اشتراك العيادات" : "Review and approve clinic subscription renewals"}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => {
          const count = tab.key
            ? requests.filter((r) => r.status === tab.key).length
            : requests.length;
          const isActive = currentStatus === tab.key;
          return (
            <a
              key={tab.key ?? "all"}
              href={
                tab.key
                  ? `/${locale}/dashboard/super-admin/subscription-requests?status=${tab.key}`
                  : `/${locale}/dashboard/super-admin/subscription-requests`
              }
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-primary text-primary-fg shadow-sm"
                  : "bg-surface-2 border border-border text-muted hover:text-foreground hover:bg-surface"
              }`}
            >
              {isAr ? tab.ar : tab.en}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                isActive ? "bg-white/20 text-white" : "bg-border text-muted"
              }`}>
                {count}
              </span>
            </a>
          );
        })}
      </div>

      {/* Requests list */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card>
            <CardBody className="py-14 text-center text-muted text-sm">
              {isAr ? "لا توجد طلبات." : "No requests found."}
            </CardBody>
          </Card>
        ) : (
          requests.map((req) => (
            <Card key={req.id} className={req.status === "PENDING" ? "border-warning/30" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{req.clinic.name}</h3>
                    <p className="text-xs text-muted font-mono">{req.clinic.slug}</p>
                  </div>
                  <Badge variant={statusVariant(req.status)}>
                    {statusLabel(req.status)}
                  </Badge>
                </div>
              </CardHeader>

              <CardBody className="space-y-4">
                {/* Info grid */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-surface-2/50 border border-card-border px-3 py-2.5">
                      <p className="text-xs text-muted">{isAr ? "الباقة" : "Plan"}</p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">{req.plan.name} — {req.plan.price} EGP</p>
                    </div>
                    <div className="rounded-lg bg-surface-2/50 border border-card-border px-3 py-2.5">
                      <p className="text-xs text-muted">{isAr ? "المدة" : "Duration"}</p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">{req.plan.durationDays} {isAr ? "يوم" : "days"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-surface-2/50 border border-card-border px-3 py-2.5">
                      <p className="text-xs text-muted">{isAr ? "رقم التحويل" : "Transfer"}</p>
                      <p className="mt-0.5 text-sm font-medium text-foreground font-mono">{req.transferPhone}</p>
                    </div>
                    <div className="rounded-lg bg-surface-2/50 border border-card-border px-3 py-2.5">
                      <p className="text-xs text-muted">{isAr ? "مقدم الطلب" : "By"}</p>
                      <p className="mt-0.5 text-sm font-medium text-foreground truncate">{req.requestedBy.fullName}</p>
                    </div>
                  </div>
                  <div className={`grid gap-2 ${req.reviewedAt ? "grid-cols-2" : "grid-cols-1"}`}>
                    <div className="rounded-lg bg-surface-2/50 border border-card-border px-3 py-2.5">
                      <p className="text-xs text-muted">{isAr ? "تاريخ الطلب" : "Requested"}</p>
                      <p className="mt-0.5 text-xs font-medium text-foreground">{formatDateTime(req.createdAt)}</p>
                    </div>
                    {req.reviewedAt && (
                      <div className="rounded-lg bg-surface-2/50 border border-card-border px-3 py-2.5">
                        <p className="text-xs text-muted">{isAr ? "تاريخ المراجعة" : "Reviewed"}</p>
                        <p className="mt-0.5 text-xs font-medium text-foreground">{formatDateTime(req.reviewedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {req.notes && (
                  <div className="rounded-lg bg-surface-2/50 border border-card-border px-3 py-2.5">
                    <p className="text-xs text-muted mb-1">{isAr ? "ملاحظات" : "Notes"}</p>
                    <p className="text-sm text-foreground">{req.notes}</p>
                  </div>
                )}

                {/* Rejection reason — shown when rejected */}
                {req.status === "REJECTED" && req.rejectionReason && (
                  <div className="rounded-lg bg-danger/8 border border-danger/25 px-4 py-3">
                    <p className="text-xs font-semibold text-danger mb-1">
                      {isAr ? "❌ سبب الرفض" : "❌ Rejection Reason"}
                    </p>
                    <p className="text-sm text-foreground">{req.rejectionReason}</p>
                  </div>
                )}

                {/* Screenshot */}
                <div>
                  <p className="text-xs text-muted mb-2">
                    {isAr ? "صورة الإيصال" : "Payment Receipt"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setExpandedImage(req.screenshotUrl)}
                    className="block w-full overflow-hidden rounded-xl border border-card-border hover:opacity-90 transition-opacity cursor-zoom-in shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={req.screenshotUrl}
                      alt={isAr ? "إيصال الدفع" : "Payment receipt"}
                      className="w-full max-h-52 object-cover"
                    />
                  </button>
                  <p className="text-xs text-muted mt-1">
                    {isAr ? "اضغط على الصورة للتكبير" : "Click to enlarge"}
                  </p>
                </div>

                {/* Review actions — only for PENDING */}
                {req.status === "PENDING" && (
                  <div className="border-t border-card-border pt-4 space-y-3">
                    {/* Rejection reason input */}
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5">
                        {isAr ? "سبب الرفض (مطلوب عند الرفض)" : "Rejection reason (required to reject)"}
                      </label>
                      <input
                        type="text"
                        value={rejectionReasons[req.id] ?? ""}
                        onChange={(e) =>
                          setRejectionReasons((prev) => ({ ...prev, [req.id]: e.target.value }))
                        }
                        placeholder={
                          isAr
                            ? "مثال: لم يصلنا التحويل بعد، يرجى إعادة الإرسال..."
                            : "e.g. Transfer not received yet, please resubmit..."
                        }
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
                      />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="primary"
                        loading={reviewing === req.id}
                        disabled={reviewing === req.id || isPending}
                        onClick={() => setConfirmReview({ requestId: req.id, approved: true })}
                      >
                        {isAr ? "✓ قبول الطلب" : "✓ Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={reviewing === req.id}
                        disabled={reviewing === req.id || isPending}
                        onClick={() => {
                          const reason = rejectionReasons[req.id]?.trim();
                          if (!reason) {
                            showToast(isAr ? "يرجى كتابة سبب الرفض أولاً" : "Please enter a rejection reason first", false);
                            return;
                          }
                          setConfirmReview({ requestId: req.id, approved: false });
                        }}
                      >
                        {isAr ? "✕ رفض الطلب" : "✕ Reject"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
