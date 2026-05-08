"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  useToast,
} from "@/components/ui";

type Clinic = { id: string; name: string; slug: string };
type DirectoryRow = {
  id: string;
  email?: string | null;
  phone?: string | null;
  fullName: string;
  role: "DOCTOR_ADMIN" | "RECEPTIONIST";
  specialty?: string | null;
  isActive: boolean;
  clinic: Clinic & { isActive: boolean };
};

type ClinicDetails = Clinic & {
  isActive: boolean;
  timezone: string;
  defaultLocale: string;
  counts: { patients: number; appointments: number; clinicUsers: number };
  subscription?: { plan?: { name: string }; expiresAt: string } | null;
  staff: Array<
    Omit<DirectoryRow, "clinic"> & {
      avatarUrl?: string | null;
      createdAt: string;
    }
  >;
};

export function PlatformDirectoryFilters({ clinics }: { clinics: Clinic[] }) {
  const { addToast } = useToast();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [role, setRole] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [pending, setPending] = useState(false);
  const [clinicDetails, setClinicDetails] = useState<ClinicDetails | null>(null);
  const [person, setPerson] = useState<
    (DirectoryRow & { avatarUrl?: string | null; createdAt?: string }) | null
  >(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (clinicId) params.set("clinicId", clinicId);
    if (q.trim()) params.set("q", q.trim());
    params.set("page", page.toString());
    params.set("limit", "20");
    return params.toString();
  }, [role, clinicId, q, page]);

  useEffect(() => {
    const controller = new AbortController();
    setPending(true);
    void fetch(`/api/users/platform-directory?${query}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          setRows([]);
          setTotalPages(1);
          return;
        }
        const data = await res.json();
        if (Array.isArray(data.rows)) {
          setRows(data.rows as DirectoryRow[]);
          setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 1);
        } else if (Array.isArray(data)) {
          // fallback: some endpoints return array directly
          setRows(data as DirectoryRow[]);
          setTotalPages(1);
        } else {
          setRows([]);
          setTotalPages(1);
        }
      })
      .catch(() => {
        setRows([]);
        setTotalPages(1);
      })
      .finally(() => setPending(false));
    return () => controller.abort();
  }, [query]);

  async function loadClinicDetails(id: string) {
    try {
      const res = await fetch(`/api/clinics/${id}/status`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data) setClinicDetails(data as ClinicDetails);
    } catch {
      // silently fail
    }
  }

  async function updateStaff(
    row: { id: string; fullName: string; clinic: Clinic },
    isActive: boolean,
  ) {
    const actionLabel = isActive
      ? isAr ? "تفعيل" : "activate"
      : isAr ? "تعطيل" : "deactivate";
    try {
      const res = await fetch(`/api/users/staff/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId: row.clinic.id, isActive }),
      });

      if (res.ok) {
        addToast(
          "success",
          isAr
            ? `تم ${actionLabel} ${row.fullName} بنجاح`
            : `${row.fullName} has been ${isActive ? "activated" : "deactivated"} successfully`,
        );
        // Refresh table
        const params = new URLSearchParams();
        if (role) params.set("role", role);
        if (clinicId) params.set("clinicId", clinicId);
        if (q.trim()) params.set("q", q.trim());
        params.set("page", page.toString());
        params.set("limit", "20");
        const refreshRes = await fetch(`/api/users/platform-directory?${params.toString()}`, { cache: "no-store" });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (Array.isArray(data.rows)) setRows(data.rows as DirectoryRow[]);
        }
        if (clinicDetails?.id === row.clinic.id) {
          await loadClinicDetails(row.clinic.id);
        }
      } else {
        addToast(
          "error",
          isAr
            ? `تعذر ${actionLabel} ${row.fullName}`
            : `Failed to ${isActive ? "activate" : "deactivate"} ${row.fullName}`,
        );
      }
    } catch {
      addToast("error", isAr ? "حدث خطأ" : "An error occurred");
    }
  }

  async function deleteStaff(row: {
    id: string;
    fullName: string;
    clinic: Clinic;
  }) {
    try {
      const res = await fetch(`/api/users/staff/${row.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId: row.clinic.id }),
      });

      if (res.ok) {
        addToast(
          "success",
          isAr
            ? `تم حذف ${row.fullName} بنجاح`
            : `${row.fullName} has been deleted successfully`,
        );
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        if (clinicDetails?.id === row.clinic.id) {
          await loadClinicDetails(row.clinic.id);
        }
        if (person?.id === row.id) setPerson(null);
      } else {
        addToast(
          "error",
          isAr ? `تعذر حذف ${row.fullName}` : `Failed to delete ${row.fullName}`,
        );
      }
    } catch {
      addToast("error", isAr ? "حدث خطأ" : "An error occurred");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "دليل المنصة" : "Platform Directory"}
          </h2>
          <Badge variant="muted">
            {pending
              ? isAr ? "جاري التحميل..." : "Loading..."
              : isAr ? `${rows.length} نتيجة` : `${rows.length} results`}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            label={isAr ? "بحث" : "Search"}
            placeholder={isAr ? "الاسم، الهاتف، البريد، العيادة" : "Name, phone, email, clinic"}
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {isAr ? "الدور" : "Role"}
            </label>
            <select
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
            >
              <option value="">{isAr ? "كل الموظفين" : "All staff"}</option>
              <option value="DOCTOR_ADMIN">{isAr ? "مدير عيادة (طبيب)" : "Doctor Admin"}</option>
              <option value="RECEPTIONIST">{isAr ? "موظف استقبال" : "Receptionist"}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {isAr ? "العيادة" : "Clinic"}
            </label>
            <select
              value={clinicId}
              onChange={(e) => { setClinicId(e.target.value); setPage(1); }}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
            >
              <option value="">{isAr ? "كل العيادات" : "All clinics"}</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setRole("");
                setClinicId("");
                setQ("");
                setPage(1);
              }}
            >
              {isAr ? "إعادة ضبط" : "Reset"}
            </Button>
          </div>
        </div>

        {pending ? (
          <div className="py-10 text-center text-sm text-muted">
            {isAr ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded border border-card-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border bg-surface-2">
                  <th className="px-3 py-2 text-start text-xs font-medium text-muted">
                    {isAr ? "الاسم" : "Name"}
                  </th>
                  <th className="px-3 py-2 text-start text-xs font-medium text-muted">
                    {isAr ? "التواصل" : "Contact"}
                  </th>
                  <th className="px-3 py-2 text-start text-xs font-medium text-muted">
                    {isAr ? "الدور" : "Role"}
                  </th>
                  <th className="px-3 py-2 text-start text-xs font-medium text-muted">
                    {isAr ? "العيادة" : "Clinic"}
                  </th>
                  <th className="px-3 py-2 text-start text-xs font-medium text-muted">
                    {isAr ? "الحالة" : "Status"}
                  </th>
                  <th className="px-3 py-2 text-end text-xs font-medium text-muted">
                    {isAr ? "الإجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-card-border last:border-0"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">
                      {row.fullName}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {row.email ?? row.phone ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="default">
                        {row.role === "DOCTOR_ADMIN"
                          ? isAr ? "مدير عيادة" : "Doctor Admin"
                          : isAr ? "استقبال" : "Receptionist"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {row.clinic.name}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          row.isActive && row.clinic.isActive
                            ? "success"
                            : "danger"
                        }
                      >
                        {row.isActive && row.clinic.isActive
                          ? isAr ? "نشط" : "Active"
                          : isAr ? "غير نشط" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-end">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => void loadClinicDetails(row.clinic.id)}
                        >
                          {isAr ? "العيادة" : "Clinic"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setPerson(row)}
                        >
                          {isAr ? "التفاصيل" : "Details"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={row.isActive ? "danger" : "secondary"}
                          onClick={() => void updateStaff(row, !row.isActive)}
                        >
                          {row.isActive
                            ? isAr ? "تعطيل" : "Disable"
                            : isAr ? "تفعيل" : "Enable"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-sm text-muted"
                    >
                      {isAr ? "لا توجد نتائج مطابقة." : "No matching staff found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">
              {isAr ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {isAr ? "السابق" : "Previous"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                {isAr ? "التالي" : "Next"}
              </Button>
            </div>
          </div>
        )}
      </CardBody>

      {/* Clinic Details Modal */}
      {clinicDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-card-border bg-card p-5 shadow-card-md">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {clinicDetails.name}
                </h2>
                <p className="text-xs text-muted">
                  {clinicDetails.slug} · {clinicDetails.timezone}
                </p>
                <p className="mt-1 text-xs text-primary">
                  {clinicDetails.subscription?.plan?.name
                    ?? (isAr ? "لا يوجد اشتراك" : "No subscription")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setClinicDetails(null)}
              >
                {isAr ? "إغلاق" : "Close"}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Badge variant="muted">
                {clinicDetails.counts.clinicUsers} {isAr ? "موظف" : "staff"}
              </Badge>
              <Badge variant="muted">
                {clinicDetails.counts.patients} {isAr ? "مريض" : "patients"}
              </Badge>
              <Badge variant="muted">
                {clinicDetails.counts.appointments} {isAr ? "موعد" : "appointments"}
              </Badge>
            </div>
            <div className="mt-4 divide-y divide-card-border rounded border border-card-border">
              {clinicDetails.staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-start justify-between gap-3 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.fullName}
                    </p>
                    <p className="text-xs text-muted">
                      {member.email ?? member.phone ?? "-"}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <Badge>
                        {member.role === "DOCTOR_ADMIN"
                          ? isAr ? "مدير عيادة" : "Doctor Admin"
                          : isAr ? "استقبال" : "Receptionist"}
                      </Badge>
                      <Badge variant={member.isActive ? "success" : "danger"}>
                        {member.isActive
                          ? isAr ? "نشط" : "Active"
                          : isAr ? "غير نشط" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setPerson({ ...member, clinic: clinicDetails })
                      }
                    >
                      {isAr ? "التفاصيل" : "Details"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={member.isActive ? "danger" : "secondary"}
                      onClick={() =>
                        void updateStaff(
                          { ...member, clinic: clinicDetails },
                          !member.isActive,
                        )
                      }
                    >
                      {member.isActive
                        ? isAr ? "تعطيل" : "Disable"
                        : isAr ? "تفعيل" : "Enable"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        void deleteStaff({ ...member, clinic: clinicDetails })
                      }
                    >
                      {isAr ? "حذف" : "Delete"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Person Details Modal */}
      {person && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-card-border bg-card p-5 shadow-card-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {isAr ? "تفاصيل الشخص" : "Person Details"}
              </h2>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPerson(null)}
              >
                {isAr ? "إغلاق" : "Close"}
              </Button>
            </div>
            {person.avatarUrl && (
              <img
                src={person.avatarUrl}
                alt=""
                className="mb-3 h-16 w-16 rounded object-cover"
              />
            )}
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">{person.fullName}</p>
              <p className="text-muted">{person.email ?? (isAr ? "لا يوجد بريد" : "No email")}</p>
              <p className="text-muted">{person.phone ?? (isAr ? "لا يوجد هاتف" : "No phone")}</p>
              <p className="text-muted">{person.clinic.name}</p>
              <div className="flex gap-2">
                <Badge>
                  {person.role === "DOCTOR_ADMIN"
                    ? isAr ? "مدير عيادة" : "Doctor Admin"
                    : isAr ? "استقبال" : "Receptionist"}
                </Badge>
                <Badge variant={person.isActive ? "success" : "danger"}>
                  {person.isActive
                    ? isAr ? "نشط" : "Active"
                    : isAr ? "غير نشط" : "Inactive"}
                </Badge>
              </div>
              {person.specialty && (
                <p className="text-muted">{person.specialty}</p>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant={person.isActive ? "danger" : "secondary"}
                onClick={() => void updateStaff(person, !person.isActive)}
              >
                {person.isActive
                  ? isAr ? "تعطيل" : "Disable"
                  : isAr ? "تفعيل" : "Enable"}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void deleteStaff(person)}
              >
                {isAr ? "حذف" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
