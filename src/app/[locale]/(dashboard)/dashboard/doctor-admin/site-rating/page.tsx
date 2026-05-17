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
  { key: "overall",  ar: "التقييم العام",     en: "Overall",         icon: "⭐" },
  { key: "ease",     ar: "سهولة الاستخدام",   en: "Ease of Use",     icon: "🖱️" },
  { key: "features", ar: "الميزات والأدوات",  en: "Features",        icon: "🔧" },
  { key: "support",  ar: "الدعم والتواصل",    en: "Support",         icon: "💬" },
] as const;

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className={`text-2xl transition-transform hover:scale-110 ${
            star <= (hovered || value) ? "text-warning" : "text-border"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`text-xl ${star <= value ? "text-warning" : "text-border"}`}>★</span>
      ))}
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
    overall: 0, ease: 0, features: 0, support: 0, comment: "", wouldRefer: false,
  });

  useEffect(() => {
    fetch("/api/site-rating")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.id) { setExisting(d); setForm(d); }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.overall === 0) {
      setError(isAr ? "يرجى تحديد التقييم العام" : "Please set the overall rating");
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
        const d = await res.json().catch(() => ({})) as Record<string, unknown>;
        setError(typeof d.message === "string" ? d.message : isAr ? "حدث خطأ" : "Error occurred");
        return;
      }
      const saved = await res.json() as Rating;
      setExisting(saved);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } finally {
      setSubmitting(false);
    }
  }

  const showForm = !existing || editing;

  return (
    <div className="space-y-6 max-w-2xl" dir={isAr ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "تقييم المنصة" : "Rate the Platform"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr ? "رأيك يساعدنا نتحسن — التقييم سري ولا يظهر لأحد غير فريق التطوير" : "Your feedback helps us improve — ratings are private and only visible to the dev team"}
        </p>
      </div>

      {success && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {isAr ? "✅ شكراً! تم حفظ تقييمك بنجاح." : "✅ Thank you! Your rating has been saved."}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : existing && !editing ? (
        /* ── Existing rating display ── */
        <div className="rounded-lg border border-card-border bg-card p-6 shadow-card-md space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">
                {isAr ? "قيّمت المنصة في" : "You rated on"}{" "}
                {existing.createdAt
                  ? new Date(existing.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-GB")
                  : "—"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <StarDisplay value={existing.overall} />
                <span className="text-lg font-bold text-foreground">{existing.overall}/5</span>
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-2 transition-colors"
            >
              {isAr ? "تعديل التقييم" : "Edit Rating"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {CRITERIA.slice(1).map((c) => (
              <div key={c.key} className="rounded-lg bg-surface p-3 text-center">
                <p className="text-lg mb-1">{c.icon}</p>
                <p className="text-xs text-muted mb-1">{isAr ? c.ar : c.en}</p>
                <StarDisplay value={existing[c.key] as number} />
              </div>
            ))}
          </div>

          {existing.comment && (
            <div className="rounded-lg bg-surface p-3">
              <p className="text-xs text-muted mb-1">{isAr ? "تعليقك:" : "Your comment:"}</p>
              <p className="text-sm text-foreground">{existing.comment}</p>
            </div>
          )}

          <div className={`flex items-center gap-2 text-sm ${existing.wouldRefer ? "text-success" : "text-muted"}`}>
            <span>{existing.wouldRefer ? "✅" : "❌"}</span>
            <span>{isAr ? "سأنصح أصحابي باستخدام المنصة" : "I would recommend this platform"}</span>
          </div>
        </div>
      ) : showForm && (
        /* ── Rating form ── */
        <form onSubmit={(e) => void handleSubmit(e)} className="rounded-lg border border-card-border bg-card p-6 shadow-card-md space-y-6">
          {CRITERIA.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{c.icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{isAr ? c.ar : c.en}</p>
                  {c.key === "overall" && (
                    <p className="text-xs text-muted">{isAr ? "رأيك الكلي عن المنصة" : "Your overall impression"}</p>
                  )}
                </div>
              </div>
              <StarInput
                value={form[c.key] as number}
                onChange={(v) => setForm((prev) => ({ ...prev, [c.key]: v }))}
              />
            </div>
          ))}

          <div className="h-px bg-card-border" />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {isAr ? "تعليق أو اقتراح (اختياري)" : "Comment or suggestion (optional)"}
            </label>
            <textarea
              rows={4}
              value={form.comment ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
              maxLength={1000}
              placeholder={isAr ? "أخبرنا بأي شيء تريد تحسينه أو تضيفه..." : "Tell us anything you'd like improved or added..."}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none ring-primary/30 focus:ring-2 transition-shadow resize-none"
            />
            <p className="text-xs text-muted text-end">{(form.comment ?? "").length}/1000</p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setForm((prev) => ({ ...prev, wouldRefer: !prev.wouldRefer }))}
              className={`relative h-6 w-11 rounded-full transition-colors ${form.wouldRefer ? "bg-primary" : "bg-border"}`}
            >
              <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.wouldRefer ? (isAr ? "translate-x-1" : "translate-x-6") : (isAr ? "translate-x-6" : "translate-x-1")}`} />
            </div>
            <span className="text-sm text-foreground">
              {isAr ? "سأنصح أصحابي باستخدام هذه المنصة" : "I would recommend this platform to colleagues"}
            </span>
          </label>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            {editing && (
              <button type="button" onClick={() => setEditing(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2 transition-colors">
                {isAr ? "إلغاء" : "Cancel"}
              </button>
            )}
            <button type="submit" disabled={submitting}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50 transition-opacity">
              {submitting
                ? (isAr ? "جارٍ الحفظ..." : "Saving...")
                : existing
                  ? (isAr ? "حفظ التعديلات" : "Save Changes")
                  : (isAr ? "إرسال التقييم" : "Submit Rating")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
