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
  clinic?: { id: string; name: string; slug: string } | null;
};

const CATEGORIES: Record<ComplaintCategory, { ar: string; en: string; icon: string }> = {
  BUG:         { ar: "خطأ تقني",          en: "Bug / Error",       icon: "🐛" },
  FEATURE:     { ar: "طلب ميزة",           en: "Feature Request",   icon: "💡" },
  PERFORMANCE: { ar: "بطء / أداء",         en: "Performance",       icon: "⚡" },
  UX:          { ar: "تجربة المستخدم",      en: "User Experience",   icon: "🎨" },
  BILLING:     { ar: "مشكلة في الفواتير",   en: "Billing Issue",     icon: "💳" },
  OTHER:       { ar: "أخرى",               en: "Other",             icon: "📌" },
};

const STATUS_META: Record<ComplaintStatus, { ar: string; en: string; color: string }> = {
  OPEN:      { ar: "مفتوحة",       en: "Open",       color: "bg-warning/15 text-warning border-warning/30" },
  IN_REVIEW: { ar: "قيد المراجعة", en: "In Review",  color: "bg-primary/15 text-primary border-primary/30" },
  RESOLVED:  { ar: "تم الحل",      en: "Resolved",   color: "bg-success/15 text-success border-success/30" },
  CLOSED:    { ar: "مغلقة",        en: "Closed",     color: "bg-muted/20 text-muted border-border" },
};

const ALL_STATUSES: ComplaintStatus[] = ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"];

function StatusBadge({ status, isAr }: { status: ComplaintStatus; isAr: boolean }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>
      {isAr ? meta.ar : meta.en}
    </span>
  );
}

export default function SuperAdminComplaintsPage() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [selected, setSelected] = useState<Complaint | null>(null);

  // Reply form state
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<ComplaintStatus>("RESOLVED");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  async function load(status?: string) {
    setLoading(true);
    try {
      const qs = status ? `?status=${status}` : "";
      const res = await fetch(`/api/admin/complaints${qs}`);
      const data = await res.json().catch(() => []);
      setComplaints(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(filterStatus || undefined); }, [filterStatus]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    setReplyError(null);
    try {
      const res = await fetch(`/api/admin/complaints/${selected.id}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminReply: replyText.trim(), status: replyStatus }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as Record<string, unknown>;
        setReplyError(typeof d.message === "string" ? d.message : isAr ? "حدث خطأ" : "Error occurred");
        return;
      }
      setSelected(null);
      setReplyText("");
      setReplyStatus("RESOLVED");
      void load(filterStatus || undefined);
    } finally {
      setReplying(false);
    }
  }

  const counts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = complaints.filter((c) => c.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {isAr ? "إدارة الشكاوي" : "Complaints Management"}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isAr
            ? "استعرض شكاوي الأطباء والمستخدمين وردّ عليها"
            : "View and respond to complaints from doctors and users"}
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterStatus("")}
          className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
            filterStatus === ""
              ? "border-primary bg-primary/10 text-primary font-medium"
              : "border-border bg-surface text-foreground hover:bg-surface-2"
          }`}
        >
          {isAr ? "الكل" : "All"} ({complaints.length})
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              filterStatus === s
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border bg-surface text-foreground hover:bg-surface-2"
            }`}
          >
            {isAr ? STATUS_META[s].ar : STATUS_META[s].en} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-foreground font-medium">{isAr ? "لا توجد شكاوي" : "No complaints found"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setSelected(c); setReplyText(c.adminReply ?? ""); setReplyStatus(c.status === "OPEN" || c.status === "IN_REVIEW" ? "RESOLVED" : c.status); }}
              className="w-full text-start rounded-lg border border-card-border bg-card p-4 hover:border-primary/40 hover:bg-surface transition-all shadow-card-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base">{CATEGORIES[c.category]?.icon}</span>
                    <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                    {c.clinic && (
                      <span className="text-xs text-muted border border-border rounded px-1.5 py-0.5">
                        {c.clinic.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1 line-clamp-2">{c.description}</p>
                  {c.adminReply && (
                    <div className="mt-2 rounded border-s-2 border-primary ps-2 text-xs text-primary">
                      {isAr ? "💬 ردك: " : "💬 Your reply: "}{c.adminReply}
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

      {/* Reply modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-lg rounded-lg border border-card-border bg-card p-6 shadow-card-md"
            dir={isAr ? "rtl" : "ltr"}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="font-semibold text-foreground">{selected.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm">{CATEGORIES[selected.category]?.icon}</span>
                  <StatusBadge status={selected.status} isAr={isAr} />
                  {selected.clinic && (
                    <span className="text-xs text-muted border border-border rounded px-1.5 py-0.5">
                      {selected.clinic.name}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-muted hover:text-foreground text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="rounded-lg bg-surface p-3 text-sm text-foreground whitespace-pre-wrap mb-4">
              {selected.description}
            </div>

            <form onSubmit={(e) => void handleReply(e)} className="space-y-4">
              {/* Status selector */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  {isAr ? "تحديث الحالة" : "Update Status"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setReplyStatus(s)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        replyStatus === s
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-surface text-foreground hover:bg-surface-2"
                      }`}
                    >
                      {isAr ? STATUS_META[s].ar : STATUS_META[s].en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply text */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  {isAr ? "الرد على الشكوى" : "Reply to Complaint"}
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={isAr ? "اكتب ردك هنا..." : "Write your reply here..."}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none ring-primary/30 focus:ring-2 transition-shadow resize-none"
                />
                <p className="text-xs text-muted text-end">{replyText.length}/2000</p>
              </div>

              {replyError && (
                <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {replyError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2 transition-colors"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={replying}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {replying
                    ? (isAr ? "جارٍ الإرسال..." : "Saving...")
                    : (isAr ? "حفظ الرد" : "Save Reply")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
