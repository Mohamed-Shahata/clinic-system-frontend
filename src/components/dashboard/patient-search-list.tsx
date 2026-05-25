"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Card, CardBody, CardHeader, Input } from "@/components/ui";

type Patient = {
  id: string;
  code: string;
  fullName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  medicalNotes?: string | null;
  createdAt: string;
};

export function PatientSearchList({
  initialPatients,
  patientBasePath,
}: {
  initialPatients: Patient[];
  /** e.g. "doctor" or "doctor-admin" — used to build /dashboard/{role}/patients/{id} */
  patientBasePath?: "doctor" | "doctor-admin";
}) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [q, setQ] = useState("");
  const [patients, setPatients] = useState(initialPatients);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Derive the correct patient detail path based on the consuming role
  const role = patientBasePath ?? "doctor-admin";

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(
        `/api/patients${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`,
        {
          signal: controller.signal,
          cache: "no-store",
        },
      )
        .then((res) => res.json())
        .then((data) => {
          // FIX: Support paginated patient response while keeping old array fallback.
          setPatients(Array.isArray(data) ? data : (data.data ?? []));
          setNextCursor(Array.isArray(data) ? null : (data.nextCursor ?? null));
        })
        .catch(() => undefined);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    const params = new URLSearchParams({ cursor: nextCursor, limit: "50" });
    if (q.trim()) params.set("q", q.trim());
    try {
      const res = await fetch(`/api/patients?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const more = Array.isArray(data) ? data : (data.data ?? []);
      setPatients((current) => [...current, ...more]);
      setNextCursor(Array.isArray(data) ? null : (data.nextCursor ?? null));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Input
            label={isAr ? "بحث عن مريض" : "Search patients"}
            placeholder={
              isAr ? "الاسم، الكود، أو الهاتف" : "Name, code, or phone"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <p className="text-xs text-muted">
            {patients.length} {isAr ? "مريض" : "patients"}
          </p>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <div className="divide-y divide-card-border">
          {patients.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-surface-2"
            >
              <Link
                href={`/${locale}/dashboard/${role}/patients/${p.id}`}
                className="min-w-0 flex-1 hover:text-primary transition-colors"
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {p.fullName}
                  </p>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted">
                    {p.code}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {p.phone ?? (isAr ? "لا يوجد هاتف" : "No phone")} ·{" "}
                  {isAr ? "تاريخ الميلاد" : "DOB"}:{" "}
                  {p.dateOfBirth
                    ? new Date(p.dateOfBirth).toLocaleDateString()
                    : "-"}
                </p>
                {p.medicalNotes && (
                  <p className="mt-1 line-clamp-2 text-xs text-foreground/70">
                    {p.medicalNotes}
                  </p>
                )}
              </Link>

              {/* Link to full patient file */}
              <Link
                href={`/${locale}/dashboard/${role}/patients/${p.id}`}
                className="inline-flex h-8 shrink-0 items-center rounded border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-surface-2 transition-colors"
              >
                {isAr ? "ملف المريض" : "Patient file"}
              </Link>
            </div>
          ))}
          {patients.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">
              {isAr ? "لا يوجد مرضى." : "No patients found."}
            </p>
          )}
        </div>
        {nextCursor && (
          <div className="border-t border-card-border px-5 py-3 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-2 disabled:opacity-60"
            >
              {loadingMore
                ? isAr
                  ? "جاري التحميل..."
                  : "Loading..."
                : isAr
                  ? "تحميل المزيد"
                  : "Load more"}
            </button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
