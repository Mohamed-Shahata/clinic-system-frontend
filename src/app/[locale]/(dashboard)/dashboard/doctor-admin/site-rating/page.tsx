"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

type Rating = {
  id?: string;
  overall: number;
  ease: number;
  features: number;
  support: number;
  comment?: string;
  wouldRefer: boolean;
  createdAt?: string;
};

const CRITERIA = [
  {
    key: "overall",
    ar: "التقييم العام",
    en: "Overall",
    descAr: "رأيك الكلي عن المنصة",
    descEn: "Your overall impression",
    icon: "⭐",
    color: "text-warning",
  },
  {
    key: "ease",
    ar: "سهولة الاستخدام",
    en: "Ease of Use",
    descAr: "مدى سهولة التنقل والاستخدام",
    descEn: "Navigation and usability",
    icon: "🖱️",
    color: "text-primary",
  },
  {
    key: "features",
    ar: "الميزات والأدوات",
    en: "Features & Tools",
    descAr: "جودة وتنوع الأدوات المتاحة",
    descEn: "Quality and range of available tools",
    icon: "🔧",
    color: "text-success",
  },
  {
    key: "support",
    ar: "الدعم والتواصل",
    en: "Support",
    descAr: "مستوى الدعم والمساعدة",
    descEn: "Level of support and assistance",
    icon: "💬",
    color: "text-danger",
  },
] as const;

const STAR_LABELS_AR = ["", "ضعيف", "مقبول", "جيد", "جيد جداً", "ممتاز"];
const STAR_LABELS_EN = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

function StarInput({
  value,
  onChange,
  isAr,
}: {
  value: number;
  onChange: (v: number) => void;
  isAr: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  const labels = isAr ? STAR_LABELS_AR : STAR_LABELS_EN;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
            className={`text-2xl transition-all duration-150 hover:scale-125 focus:outline-none ${
              star <= active
                ? "text-warning drop-shadow-[0_0_6px_hsl(var(--warning)/0.5)]"
                : "text-border hover:text-warning/40"
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <span
        className={`text-xs font-medium transition-opacity duration-150 ${
          active ? "opacity-100 text-warning" : "opacity-0"
        }`}
      >
        {labels[active]}
      </span>
    </div>
  );
}

function StarBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted w-24 shrink-0 text-end">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-warning transition-all duration-500"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-foreground w-6 shrink-0">
        {value}/5
      </span>
    </div>
  );
}

function AverageRing({ value }: { value: number }) {
  const pct = (value / 5) * 100;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg
        className="absolute inset-0 -rotate-90"
        width="96"
        height="96"
        viewBox="0 0 96 96"
      >
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke="hsl(var(--surface-2))"
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke="hsl(var(--warning))"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="text-center z-10">
        <p className="text-2xl font-bold text-foreground leading-none">
          {value}
        </p>
        <p className="text-xs text-muted mt-0.5">/5</p>
      </div>
    </div>
  );
}

export default function SiteRatingPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [existing, setExisting] = useState<Rating | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Rating>({
    overall: 0,
    ease: 0,
    features: 0,
    support: 0,
    comment: "",
    wouldRefer: false,
  });

  useEffect(() => {
    fetch("/api/site-rating")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.id) {
          setExisting(d);
          setForm(d);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.overall === 0) {
      setError(
        isAr
          ? "يرجى تحديد التقييم العام أولاً"
          : "Please set the overall rating first",
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/site-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        setError(
          typeof d.message === "string"
            ? d.message
            : isAr
              ? "حدث خطأ"
              : "Error occurred",
        );
        return;
      }
      const saved = (await res.json()) as Rating;
      setExisting(saved);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } finally {
      setSubmitting(false);
    }
  }

  const avgScore = existing
    ? Math.round(
        ((existing.overall +
          existing.ease +
          existing.features +
          existing.support) /
          4) *
          10,
      ) / 10
    : 0;

  const showForm = !existing || editing;

  return (
    <div className="space-y-6 max-w-2xl" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isAr ? "تقييم المنصة" : "Rate the Platform"}
          </h1>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            {isAr
              ? "رأيك يساعدنا على التطوير — التقييم سري ولا يظهر لأحد غير فريق التطوير"
              : "Your feedback helps us improve — ratings are private and only visible to the dev team"}
          </p>
        </div>
        {existing && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            {isAr ? "تعديل" : "Edit"}
          </button>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
          <span className="text-lg">✅</span>
          <p className="text-sm font-medium text-success">
            {isAr
              ? "شكراً! تم حفظ تقييمك بنجاح."
              : "Thank you! Your rating has been saved."}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : existing && !editing ? (
        /* ── Existing rating view ── */
        <div className="space-y-4">
          {/* Summary card */}
          <div className="rounded-xl border border-card-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-6">
              <AverageRing value={avgScore} />
              <div className="flex-1 space-y-2.5">
                {CRITERIA.map((c) => (
                  <StarBar
                    key={c.key}
                    value={existing[c.key] as number}
                    label={isAr ? c.ar : c.en}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-card-border flex items-center justify-between text-xs text-muted">
              <span>
                {isAr ? "قيّمت في" : "Rated on"}{" "}
                {existing.createdAt
                  ? new Date(existing.createdAt).toLocaleDateString(
                      isAr ? "ar-EG" : "en-GB",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )
                  : "—"}
              </span>
              <div
                className={`flex items-center gap-1.5 font-medium ${
                  existing.wouldRefer ? "text-success" : "text-muted"
                }`}
              >
                <span>{existing.wouldRefer ? "✅" : "❌"}</span>
                <span>{isAr ? "أنصح بها" : "Would recommend"}</span>
              </div>
            </div>
          </div>

          {/* Comment */}
          {existing.comment && (
            <div className="rounded-xl border border-card-border bg-card px-5 py-4">
              <p className="text-xs font-medium text-muted mb-2">
                {isAr ? "تعليقك" : "Your comment"}
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {existing.comment}
              </p>
            </div>
          )}

          {/* Share nudge */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-center gap-4">
            <span className="text-2xl">🤝</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {isAr ? "أعجبك النظام؟" : "Enjoying the system?"}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {isAr
                  ? "شاركه مع زملائك الأطباء وساعدهم في إدارة عياداتهم."
                  : "Share it with fellow doctors and help them manage their clinics."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        showForm && (
          /* ── Rating form ── */
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="rounded-xl border border-card-border bg-card shadow-sm overflow-hidden"
          >
            {/* Criteria rows */}
            <div className="divide-y divide-card-border">
              {CRITERIA.map((c) => (
                <div
                  key={c.key}
                  className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-surface/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center text-lg shrink-0">
                      {c.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {isAr ? c.ar : c.en}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {isAr ? c.descAr : c.descEn}
                      </p>
                    </div>
                  </div>
                  <StarInput
                    value={form[c.key] as number}
                    onChange={(v) =>
                      setForm((prev) => ({ ...prev, [c.key]: v }))
                    }
                    isAr={isAr}
                  />
                </div>
              ))}
            </div>

            {/* Comment & extras */}
            <div className="px-6 py-5 space-y-5 border-t border-card-border bg-surface/30">
              {/* Textarea */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  {isAr ? "تعليق أو اقتراح" : "Comment or suggestion"}
                  <span className="text-muted font-normal ms-1">
                    ({isAr ? "اختياري" : "optional"})
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={form.comment ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, comment: e.target.value }))
                  }
                  maxLength={1000}
                  placeholder={
                    isAr
                      ? "أخبرنا بأي شيء تريد تحسينه أو تضيفه..."
                      : "Tell us anything you'd like improved or added..."
                  }
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none ring-primary/30 focus:ring-2 transition-shadow resize-none"
                />
                <p className="text-xs text-muted text-end">
                  {(form.comment ?? "").length}/1000
                </p>
              </div>

              {/* ✅ FIXED: Would refer toggle — RTL-safe, no conditional translate */}
              <label className="flex items-center gap-3 cursor-pointer select-none group">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.wouldRefer}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      wouldRefer: !prev.wouldRefer,
                    }))
                  }
                  className={`relative shrink-0 h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    form.wouldRefer ? "bg-primary" : "bg-border"
                  }`}
                >
                  {/*
                   * FIX: translate-x-6 = ON (right side in LTR & RTL absolute positioning)
                   *      translate-x-1 = OFF (left side)
                   * Removed isAr condition — absolute positioning isn't affected by dir=""
                   */}
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      form.wouldRefer ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {isAr
                      ? "سأنصح أصحابي باستخدام هذه المنصة"
                      : "I would recommend this platform to colleagues"}
                  </p>
                  <p className="text-xs text-muted">
                    {isAr
                      ? "شارك تجربتك مع زملائك الأطباء"
                      : "Share your experience with fellow doctors"}
                  </p>
                </div>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-card-border bg-surface/20">
              {editing && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || form.overall === 0}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-fg border-t-transparent" />
                    {isAr ? "جارٍ الحفظ..." : "Saving..."}
                  </>
                ) : existing ? (
                  isAr ? (
                    "حفظ التعديلات"
                  ) : (
                    "Save Changes"
                  )
                ) : isAr ? (
                  "إرسال التقييم"
                ) : (
                  "Submit Rating"
                )}
              </button>
            </div>
          </form>
        )
      )}
    </div>
  );
}
