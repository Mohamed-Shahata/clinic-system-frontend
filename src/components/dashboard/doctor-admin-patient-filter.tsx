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

  const btnBase =
    "px-3 py-1.5 text-sm rounded-lg border transition-colors font-medium";
  const btnActive =
    "bg-primary text-primary-foreground border-primary";
  const btnInactive =
    "bg-surface border-card-border text-foreground hover:border-primary/50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted font-medium">
        {isAr ? "عرض:" : "Show:"}
      </span>

      {/* All clinic patients */}
      <button
        className={`${btnBase} ${currentFilter === "clinic" ? btnActive : btnInactive}`}
        onClick={() => applyFilter("clinic")}
      >
        {isAr ? "كل العيادة" : "All Clinic"}
      </button>

      {/* My own patients */}
      <button
        className={`${btnBase} ${currentFilter === "self" ? btnActive : btnInactive}`}
        onClick={() => applyFilter("self")}
      >
        {isAr ? "مرضاي" : "My Patients"}
      </button>

      {/* Specific doctor */}
      <div className="flex items-center gap-1">
        <button
          className={`${btnBase} ${currentFilter === "doctor" ? btnActive : btnInactive}`}
          onClick={() => {
            if (selectedDoctorId) applyFilter("doctor", selectedDoctorId);
          }}
        >
          {isAr ? "دكتور محدد" : "By Doctor"}
        </button>
        <select
          className="text-sm border border-card-border rounded-lg px-2 py-1.5 bg-surface text-foreground focus:outline-none focus:border-primary"
          value={selectedDoctorId}
          onChange={(e) => {
            setSelectedDoctorId(e.target.value);
            if (e.target.value) applyFilter("doctor", e.target.value);
          }}
        >
          <option value="">
            {isAr ? "اختر دكتور..." : "Select doctor..."}
          </option>
          {doctors
            .filter((d) => d.id !== selfId)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
                {d.specialty ? ` (${d.specialty})` : ""}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
