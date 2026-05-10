"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardBody, CardHeader, Badge } from "@/components/ui";
import { formatNumber, formatPercent } from "@/lib/dashboard-format";

type Row = {
  doctorId: string;
  doctorName: string;
  paymentMode?: string | null;
  fixedMonthlyRent?: string | null;
  adminPercentage?: string | null;
  patientCount: number;
  grossAmount: number;
  deduction: number;
  netAmount: number;
};

export function DoctorEarningsPanel() {
  const t = useTranslations("dashboard.reports");
  const locale = useLocale();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    void fetch("/api/billing/doctor-earnings")
      .then((res) => res.json())
      .then((data) => setRows(Array.isArray(data) ? data : []));
  }, []);

  return (
    <Card>
      <CardHeader><h2 className="text-sm font-semibold text-foreground">{t("doctorEarnings")}</h2></CardHeader>
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-surface-2">
                <th className="px-3 py-2 text-start text-xs text-muted">{t("earningsDoctorCol")}</th>
                <th className="px-3 py-2 text-start text-xs text-muted">{t("earningsAgreementCol")}</th>
                <th className="px-3 py-2 text-end text-xs text-muted">{t("earningsPatientsCol")}</th>
                <th className="px-3 py-2 text-end text-xs text-muted">{t("earningsGrossCol")}</th>
                <th className="px-3 py-2 text-end text-xs text-muted">{t("earningsShareCol")}</th>
                <th className="px-3 py-2 text-end text-xs text-muted">{t("earningsNetCol")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.doctorId} className="border-b border-card-border last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">{row.doctorName}</td>
                  <td className="px-3 py-2">
                    <Badge variant="muted">
                      {row.paymentMode === "FIXED_RENT"
                        ? `${t("earningsRentPrefix")} ${formatNumber(row.fixedMonthlyRent ?? 0, locale)}`
                        : row.paymentMode === "PERCENTAGE"
                          ? formatPercent(Number(row.adminPercentage ?? 0), locale)
                          : t("earningsUnset")}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-end">{formatNumber(row.patientCount, locale)}</td>
                  <td className="px-3 py-2 text-end">{formatNumber(row.grossAmount, locale)} EGP</td>
                  <td className="px-3 py-2 text-end">{formatNumber(row.deduction, locale)} EGP</td>
                  <td className="px-3 py-2 text-end font-medium">{formatNumber(row.netAmount, locale)} EGP</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted">{t("earningsEmpty")}</td></tr>}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
