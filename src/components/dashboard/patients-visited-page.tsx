"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input } from "@/components/ui";

type Patient = {
  id: string;
  code: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  createdAt: string;
};

type Appointment = {
  id: string;
  patientId: string;
  status: string;
  startsAt: string;
  doctor?: { fullName: string } | null;
};

const PAGE_SIZE = 10;

export function PatientsVisitedPage({
  patients,
  appointments,
  locale,
}: {
  patients: Patient[];
  appointments: Appointment[];
  locale: string;
}) {
  const t = useTranslations("dashboard.receptionPatients");
  const isAr = locale === "ar";
  const [search, setSearch] = useState("");
  const [daysFilter, setDaysFilter] = useState("1");
  const [page, setPage] = useState(1);

  const statusLabels: Record<string, string> = {
    IN_QUEUE: t("statusBooked"),
    IN_PROGRESS: t("statusInProgress"),
    COMPLETED: t("statusCompleted"),
    CANCELLED: t("statusCancelled"),
  };

  const statusVariant = (
    s: string,
  ): "default" | "success" | "warning" | "danger" | "muted" => {
    if (s === "COMPLETED") return "success";
    if (s === "IN_PROGRESS") return "warning";
    if (s === "CANCELLED") return "danger";
    if (s === "IN_QUEUE") return "default";
    return "muted";
  };

  // Build a map of patientId → their appointments (sorted by most recent)
  const aptsByPatient = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const list = map.get(a.patientId) ?? [];
      list.push(a);
      map.set(a.patientId, list);
    }
    // Sort each list descending by startsAt
    map.forEach((list) =>
      list.sort(
        (a, b) =>
          new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      ),
    );
    return map;
  }, [appointments]);

  // Only patients who have at least one appointment
  const visitedPatients = useMemo(
    () => patients.filter((p) => aptsByPatient.has(p.id)),
    [patients, aptsByPatient],
  );

  const filteredPatients = useMemo(() => {
    let result = visitedPatients;

    // Text search
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((p) =>
        `${p.fullName} ${p.phone ?? ""} ${p.code}`.toLowerCase().includes(q),
      );
    }

    const days = Number(daysFilter || 1);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    result = result.filter((p) => {
      const apts = aptsByPatient.get(p.id) ?? [];
      return apts.some((a) => new Date(a.startsAt).getTime() >= start.getTime());
    });

    return result;
  }, [visitedPatients, search, daysFilter, aptsByPatient]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPatients.length / PAGE_SIZE),
  );
  const pagedPatients = filteredPatients.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted mt-0.5">{t("description")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-56">
          <label className="mb-1 block text-sm font-medium text-foreground">
            {t("dateLabel")}
          </label>
          <select
            value={daysFilter}
            onChange={(e) => {
              setDaysFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded border border-border bg-surface px-3 text-sm text-foreground"
          >
            <option value="1">{isAr ? "اليوم" : "Today"}</option>
            <option value="7">{isAr ? "آخر 7 أيام" : "Last 7 days"}</option>
            <option value="30">{isAr ? "آخر 30 يوم" : "Last 30 days"}</option>
          </select>
        </div>
        <div className="w-full sm:max-w-sm">
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">
            {t("title")}{" "}
            <span className="text-muted font-normal">
              ({filteredPatients.length})
            </span>
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {filteredPatients.length === 0 ? (
            <EmptyState
              title={search ? t("noSearchResults") : t("noVisitsThisDay")}
            />
          ) : (
            <>
              <div className="divide-y divide-card-border">
                {pagedPatients.map((p) => {
                  const apts = aptsByPatient.get(p.id) ?? [];
                  // Latest appointment relevant to date filter (or overall latest)
                  const days = Number(daysFilter || 1);
                  const start = new Date();
                  start.setHours(0, 0, 0, 0);
                  start.setDate(start.getDate() - (days - 1));
                  const relevantApt = daysFilter
                    ? (apts.find((a) => new Date(a.startsAt).getTime() >= start.getTime()) ?? apts[0])
                    : apts[0];
                  const latestStatus = relevantApt?.status;

                  return (
                    <div
                      key={p.id}
                      className="px-5 py-3.5 hover:bg-surface-2 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground">
                              {p.fullName}
                            </p>
                            <span className="font-mono text-xs text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                              {p.code}
                            </span>
                            {latestStatus && (
                              <Badge variant={statusVariant(latestStatus)}>
                                {statusLabels[latestStatus] ?? latestStatus}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted mt-0.5">
                            {p.phone ?? t("noPhone")}
                            {relevantApt && (
                              <>
                                {" · "}
                                {relevantApt.doctor?.fullName ??
                                  t("noDoctor")}
                                {" · "}
                                {new Date(
                                  relevantApt.startsAt,
                                ).toLocaleDateString(isAr ? "ar-EG" : "en-GB")}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="text-end shrink-0">
                          <p className="text-xs text-muted">
                            {t("visits")}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {apts.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-card-border">
                  <span className="text-xs text-muted">
                    {t("page", { current: String(page), total: String(totalPages) })}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((prev) => prev - 1)}
                    >
                      {t("prev")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((prev) => prev + 1)}
                    >
                      {t("next")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
