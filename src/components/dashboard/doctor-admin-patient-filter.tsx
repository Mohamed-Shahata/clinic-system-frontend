"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Doctor = { id: string; fullName: string; specialty: string | null };

interface Props {
  doctors: Doctor[];
  currentFilter: string;
  currentDoctorId?: string;
  selfId: string;
  isAr: boolean;
  locale: string;
}

export function DoctorAdminPatientFilter({
  doctors,
  currentFilter,
  currentDoctorId,
  selfId,
  isAr,
  locale,
}: Props) {
  const router = useRouter();
  const [selectedDoctorId, setSelectedDoctorId] = useState(
    currentDoctorId ?? "",
  );

  const basePath = `/${locale}/dashboard/doctor-admin/patients`;

  function applyFilter(filter: string, doctorId?: string) {
    const params = new URLSearchParams();
    params.set("filter", filter);
    if (filter === "doctor" && doctorId) params.set("doctorId", doctorId);
    router.push(`${basePath}?${params.toString()}`);
  }

  const otherDoctors = doctors.filter((d) => d.id !== selfId);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <span className="text-xs text-muted font-medium shrink-0">
        {isAr ? "عرض:" : "Show:"}
      </span>

      {/* Pill group */}
      <div className="flex flex-wrap gap-1.5">
        {/* All clinic patients */}
        <button
          className={[
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
            currentFilter === "clinic"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-surface border-border text-foreground hover:border-primary/50 hover:bg-surface-2",
          ].join(" ")}
          onClick={() => applyFilter("clinic")}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {isAr ? "كل العيادة" : "All Clinic"}
        </button>

        {/* My own patients */}
        <button
          className={[
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
            currentFilter === "self"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-surface border-border text-foreground hover:border-primary/50 hover:bg-surface-2",
          ].join(" ")}
          onClick={() => applyFilter("self")}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {isAr ? "مرضاي" : "My Patients"}
        </button>
      </div>

      {/* By Doctor — select styled as pill */}
      {otherDoctors.length > 0 && (
        <div className="relative">
          <select
            className={[
              "appearance-none inline-flex items-center gap-1.5 ps-3 pe-7 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer outline-none focus:ring-2 ring-primary/30",
              currentFilter === "doctor"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-surface border-border text-foreground hover:border-primary/50 hover:bg-surface-2",
            ].join(" ")}
            value={selectedDoctorId}
            onChange={(e) => {
              setSelectedDoctorId(e.target.value);
              if (e.target.value) applyFilter("doctor", e.target.value);
            }}
          >
            <option value="">
              {isAr ? "📋 دكتور محدد..." : "📋 By Doctor..."}
            </option>
            {otherDoctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
                {d.specialty ? ` (${d.specialty})` : ""}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-current opacity-70">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
      )}
    </div>
  );
}
