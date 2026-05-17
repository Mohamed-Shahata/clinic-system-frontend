"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

type ComplaintStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED";
type ComplaintCategory = "BUG" | "FEATURE" | "PERFORMANCE" | "UX" | "BILLING" | "OTHER";

type Complaint = {
  id: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  status: ComplaintStatus;
  adminReply?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
};

const CATEGORIES: { value: ComplaintCategory; ar: string; en: string; icon: string }[] = [
  { value: "BUG",         ar: "خطأ تقني",         en: "Bug / Error",       icon: "🐛" },
  { value: "FEATURE",     ar: "طلب ميزة",          en: "Feature Request",   icon: "💡" },
  { value: "PERFORMANCE", ar: "بطء / أداء",        en: "Performance",       icon: "⚡" },
  { value: "UX",          ar: "تجربة المستخدم",     en: "User Experience",   icon: "🎨" },
  { value: "BILLING",     ar: "مشكلة في الفواتير",  en: "Billing Issue",     icon: "💳" },
  { value: "OTHER",       ar: "أخرى",              en: "Other",             icon: "📌" },
];

const STATUS_META: Record<ComplaintStatus, { ar: string; en: string; color: string }> = {
  OPEN:      { ar: "مفتوحة",       en: "Open",        color: "bg-warning/15 text-warning border-warning/30" },
  IN_REVIEW: { ar: "قيد المراجعة", en: "In Review",   color: "bg-primary/15 text-primary border-primary/30" },
  RESOLVED:  { ar: "تم الحل",      en: "Resolved",    color: "bg-success/15 text-success border-success/30" },
  CLOSED:    { ar: "مغلقة",        en: "Closed",      color: "bg-muted/20 text-muted border-border" },
};

function StatusBadge({ status, isAr }: { status: ComplaintStatus; isAr: boolean }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>
      {isAr ? meta.ar : meta.en}
    </span>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="text-warning text-sm">
      {"★".repeat(value)}{"☆".repeat(5 - value)}
    </span>
  );
}

export default function ComplaintsPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Complaint | null>(null);

  // Form state
  const [category, setCategory] = useState<ComplaintCategory>("BUG");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/complaints");
      const data = await res.json().catch(() => []);
      setComplaints(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title: title.trim(), description: description.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as Record<string, unknown>;
        setFormError(typeof d.message === "string" ? d.message : isAr ? "حدث خطأ" : "Error occurred");
        return;
      }
      setSuccess(true);
      setTitle(""); setDescription(""); setCategory("BUG");
      setShowForm(false);
      void load();
      setTimeout(() => setSuccess(false), 4000);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isAr ? "الشكاوي والملاحظات" : "Complaints & Feedback"}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {isAr ? "أبلغنا عن أي مشكلة أو اقتراح وسنرد في أقرب وقت" : "Report any issue or suggestion and we'll respond ASAP"}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90 transition-opacity"
        >
          <span>{showForm ? (isAr ? "إلغاء" : "Cancel") : (isAr ? "+ شكوى جديدة" : "+ New Complaint")}</span>
        </button>
      </div>

      {success && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {isAr ? "✅ تم إرسال شكواك بنجاح. سنرد عليك في أقرب وقت." : "✅ Complaint submitted successfully. We'll respond soon."}
        </div>
      )}

      {/* New Complaint Form */}
      {showForm && (
        <div className="rounded-lg border border-card-border bg-card p-5 shadow-card-md">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            {isAr ? "تقديم شكوى جديدة" : "Submit New Complaint"}
          </h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {/* Category */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                {isAr ? "نوع المشكلة" : "Category"}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      category === c.value
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-surface text-foreground hover:bg-surface-2"
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{isAr ? c.ar : c.en}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                {isAr ? "العنوان" : "Title"}
              </label>
              <input
                type="text" required maxLength={120} value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isAr ? "اكتب عنوان مختصر للمشكلة" : "Brief title for the issue"}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none ring-primary/30 focus:ring-2 transition-shadow"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                {isAr ? "الوصف التفصيلي" : "Detailed Description"}
              </label>
              <textarea
                required rows={5} maxLength={2000} value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isAr ? "اشرح المشكلة بالتفصيل — كلما كان الوصف أوضح كان الحل أسرع" : "Describe the issue in detail — the clearer the description, the faster the fix"}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none ring-primary/30 focus:ring-2 transition-shadow resize-none"
              />
              <p className="text-xs text-muted text-end">{description.length}/2000</p>
            </div>

            {formError && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2 transition-colors">
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button type="submit" disabled={submitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50 transition-opacity">
                {submitting ? (isAr ? "جارٍ الإرسال..." : "Submitting...") : (isAr ? "إرسال الشكوى" : "Submit Complaint")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-foreground font-medium">{isAr ? "لا توجد شكاوي بعد" : "No complaints yet"}</p>
          <p className="text-sm text-muted mt-1">{isAr ? "اضغط على 'شكوى جديدة' لإرسال مشكلة" : "Click 'New Complaint' to report an issue"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c)}
              className="w-full text-start rounded-lg border border-card-border bg-card p-4 hover:border-primary/40 hover:bg-surface transition-all shadow-card-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base">
                      {CATEGORIES.find((x) => x.value === c.category)?.icon}
                    </span>
                    <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                  </div>
                  <p className="text-xs text-muted mt-1 line-clamp-2">{c.description}</p>
                  {c.adminReply && (
                    <div className="mt-2 rounded border-s-2 border-primary ps-2 text-xs text-primary">
                      {isAr ? "💬 رد الإدارة: " : "💬 Admin reply: "}{c.adminReply}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <StatusBadge status={c.status} isAr={isAr} />
                  <span className="text-xs text-muted">
                    {new Date(c.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-GB")}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-card-border bg-card p-6 shadow-card-md" dir={isAr ? "rtl" : "ltr"}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="font-semibold text-foreground">{selected.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm">{CATEGORIES.find((x) => x.value === selected.category)?.icon}</span>
                  <StatusBadge status={selected.status} isAr={isAr} />
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="rounded-lg bg-surface p-3 text-foreground whitespace-pre-wrap">{selected.description}</div>
              {selected.adminReply && (
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                  <p className="text-xs font-medium text-primary mb-1">{isAr ? "رد الإدارة:" : "Admin Reply:"}</p>
                  <p className="text-foreground whitespace-pre-wrap">{selected.adminReply}</p>
                </div>
              )}
              <p className="text-xs text-muted">
                {isAr ? "أُرسلت في: " : "Submitted: "}
                {new Date(selected.createdAt).toLocaleString(isAr ? "ar-EG" : "en-GB")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
