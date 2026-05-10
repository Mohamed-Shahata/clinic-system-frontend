"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Alert, Badge, Button } from "@/components/ui";
import { roleLabel } from "@/lib/dashboard-format";

type StaffDetails = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role: string;
  specialty?: string | null;
  isActive: boolean;
  createdAt: string;
};

export function StaffActions({
  userId,
  name,
  currentUserId,
}: {
  userId: string;
  name: string;
  currentUserId?: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const isAr = locale === "ar";
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<StaffDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function load() {
    setOpen(true);
    if (details) return;
    const res = await fetch(`/api/users/staff/${userId}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) setDetails(data as StaffDetails);
    else setError(typeof data.message === "string" ? data.message : isAr ? "تعذر تحميل بيانات الموظف" : "Could not load staff details");
  }

  async function remove() {
    if (userId === currentUserId) {
      setError(isAr ? "لا يمكنك حذف نفسك." : "You cannot delete yourself.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/users/staff/${userId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={load}>
          {isAr ? "عرض" : "Details"}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          loading={pending}
          onClick={() => setConfirmDelete(true)}
          disabled={userId === currentUserId}
        >
          {isAr ? "حذف" : "Delete"}
        </Button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-card-border bg-card p-5 shadow-card-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {isAr ? "بيانات الموظف" : "Staff Details"}
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                {isAr ? "إغلاق" : "Close"}
              </Button>
            </div>
            {error && <Alert variant="error">{error}</Alert>}
            {details && (
              <div className="space-y-3 text-sm">
                {details.avatarUrl && <img src={details.avatarUrl} alt="" className="h-16 w-16 rounded object-cover" />}
                <p className="font-medium text-foreground">{details.fullName}</p>
                <p className="text-muted">{details.email ?? (isAr ? "لا يوجد بريد إلكتروني" : "No email")}</p>
                <p className="text-muted">{details.phone ?? (isAr ? "لا يوجد هاتف" : "No phone")}</p>
                <div className="flex gap-2">
                  <Badge>{roleLabel(details.role, locale)}</Badge>
                  <Badge variant={details.isActive ? "success" : "danger"}>
                    {details.isActive ? (isAr ? "نشط" : "Active") : (isAr ? "غير نشط" : "Inactive")}
                  </Badge>
                </div>
                {details.specialty && <p className="text-muted">{details.specialty}</p>}
                <p className="text-xs text-muted">{new Date(details.createdAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg border border-card-border bg-card p-5 shadow-card-md">
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "تأكيد الحذف" : "Confirm Delete"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {isAr ? `هل تريد حذف ${name}؟` : `Delete ${name}?`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="button" variant="danger" size="sm" loading={pending} onClick={() => void remove()}>
                {isAr ? "حذف" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
