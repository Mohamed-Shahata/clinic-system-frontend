"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, Input } from "@/components/ui";
import { PatientHistoryModal } from "@/components/dashboard/patient-history-modal";

type Patient = {
  id: string;
  code: string;
  fullName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  medicalNotes?: string | null;
  createdAt: string;
};

export function PatientSearchList({ initialPatients }: { initialPatients: Patient[] }) {
  const [q, setQ] = useState("");
  const [patients, setPatients] = useState(initialPatients);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/patients${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then((res) => res.json())
        .then((data) => setPatients(Array.isArray(data) ? data : []))
        .catch(() => undefined);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Input label="Search patients" placeholder="Name, code, or phone" value={q} onChange={(e) => setQ(e.target.value)} />
          <p className="text-xs text-muted">{patients.length} patients</p>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <div className="divide-y divide-card-border">
          {patients.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-surface-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{p.fullName}</p>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted">{p.code}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {p.phone ?? "No phone"} · DOB: {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : "-"}
                </p>
                {p.medicalNotes && <p className="mt-1 line-clamp-2 text-xs text-foreground/70">{p.medicalNotes}</p>}
              </div>
              <PatientHistoryModal patient={p} />
            </div>
          ))}
          {patients.length === 0 && <p className="py-10 text-center text-sm text-muted">No patients found.</p>}
        </div>
      </CardBody>
    </Card>
  );
}
