"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Card, CardBody, CardHeader } from "@/components/ui";

function MiniDonut({ first, second, firstColor, secondColor }: { first: number; second: number; firstColor: string; secondColor: string }) {
  const total = Math.max(1, first + second);
  const firstPct = (first / total) * 100;
  return <div className="mx-auto h-24 w-24 rounded-full" style={{ background: `conic-gradient(${firstColor} 0% ${firstPct}%, ${secondColor} ${firstPct}% 100%)` }} />;
}

export function DoctorAdminAnalytics({
  patients,
  monthlyRevenue,
}: {
  patients: Array<{ createdAt: string }>;
  monthlyRevenue: Array<{ month: string; amount: number }>;
}) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const monthPatients = useMemo(
    () =>
      patients.filter((p) => {
        const d = new Date(p.createdAt);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      }).length,
    [patients, year, month],
  );

  const yearPatients = useMemo(
    () => patients.filter((p) => new Date(p.createdAt).getFullYear() === year).length,
    [patients, year],
  );

  const filteredRevenue = monthlyRevenue.filter((m) => Number(m.month.slice(0, 4)) === year);
  const totalYearRevenue = filteredRevenue.reduce((sum, item) => sum + item.amount, 0);
  const selectedMonthRevenue =
    filteredRevenue.find((item) => Number(item.month.slice(-2)) === month)?.amount ?? 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader><h2 className="text-sm font-semibold">{isAr ? "الفلاتر" : "Filters"}</h2></CardHeader>
        <CardBody className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs text-muted">{isAr ? "السنة" : "Year"}</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value || new Date().getFullYear()))} className="w-full rounded border border-border bg-surface px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">{isAr ? "الشهر" : "Month"}</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full rounded border border-border bg-surface px-3 py-2 text-sm">
              {Array.from({ length: 12 }).map((_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
            </select>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><h2 className="text-sm font-semibold">{isAr ? "المرضى" : "Patients"}</h2></CardHeader>
        <CardBody className="space-y-1 text-sm">
          <MiniDonut first={monthPatients} second={Math.max(0, yearPatients - monthPatients)} firstColor="#14b8a6" secondColor="#334155" />
          <p>{isAr ? "هذا الشهر" : "This month"}: <span className="font-semibold">{monthPatients}</span></p>
          <p>{isAr ? "هذه السنة" : "This year"}: <span className="font-semibold">{yearPatients}</span></p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><h2 className="text-sm font-semibold">{isAr ? "الإيرادات" : "Revenue"}</h2></CardHeader>
        <CardBody className="space-y-1 text-sm">
          <MiniDonut first={selectedMonthRevenue} second={Math.max(0, totalYearRevenue - selectedMonthRevenue)} firstColor="#6366f1" secondColor="#374151" />
          <p>{isAr ? "الشهر المحدد" : "Selected month"}: <span className="font-semibold">{selectedMonthRevenue.toLocaleString()}</span></p>
          <p>{isAr ? "إجمالي السنة" : "Total year"}: <span className="font-semibold">{totalYearRevenue.toLocaleString()}</span></p>
          <div className="space-y-1 text-xs">
            {filteredRevenue.map((item) => (
              <div key={item.month} className="flex justify-between">
                <span>{item.month}</span>
                <span>{item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
