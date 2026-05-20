"use client";

import { jsPDF } from "jspdf";
import { Button } from "@/components/ui";

type ReportsPdfButtonProps = {
  locale: string;
  clinicName?: string;
  revenue: number;
  invoicesCount: number;
  completedCount: number;
  casesByDoctor: Array<{ doctor: string; count: number }>;
  monthlyRevenue?: Array<[string, number]>;
  paymentBreakdown?: Record<string, number>;
  pendingCount?: number;
};

export function ReportsPdfButton({
  locale,
  clinicName,
  revenue,
  invoicesCount,
  completedCount,
  casesByDoctor,
  monthlyRevenue = [],
  paymentBreakdown = {},
  pendingCount = 0,
}: ReportsPdfButtonProps) {
  const isAr = locale === "ar";
  function downloadReport() {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageW = 210;
    const marginL = 18;
    const marginR = 18;
    const contentW = pageW - marginL - marginR;
    const today = new Date();
    // Always English in PDF regardless of UI locale
    const dateLocale = "en-GB";
    const dateStr = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const timeStr = today.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let y = 0;

    // ── Header band ──────────────────────────────────────────────────
    doc.setFillColor(30, 58, 138); // deep blue
    doc.rect(0, 0, pageW, 38, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(isAr ? "CLINIC REPORT" : "CLINIC PERFORMANCE REPORT", marginL, 17);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${isAr ? "Clinic" : "Clinic"}: ${clinicName ?? "—"}`,
      marginL,
      25,
    );
    doc.text(
      `${isAr ? "Generated" : "Generated"}: ${dateStr}  ${timeStr}`,
      marginL,
      31,
    );

    y = 48;

    // ── Section helper ────────────────────────────────────────────────
    function sectionTitle(title: string) {
      doc.setFillColor(241, 245, 249);
      doc.rect(marginL, y - 4, contentW, 8, "F");
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(title.toUpperCase(), marginL + 3, y + 1);
      y += 10;
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "normal");
    }

    function row(label: string, value: string, highlight = false) {
      if (highlight) {
        doc.setFillColor(239, 246, 255);
        doc.rect(marginL, y - 4, contentW, 7, "F");
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", highlight ? "bold" : "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(label, marginL + 3, y);
      doc.setTextColor(20, 20, 20);
      doc.text(value, pageW - marginR, y, { align: "right" });
      y += 7;
    }

    function divider() {
      doc.setDrawColor(220, 220, 220);
      doc.line(marginL, y, pageW - marginR, y);
      y += 5;
    }

    // ── Summary KPIs ──────────────────────────────────────────────────
    sectionTitle("Summary");

    // 4-box KPI grid
    const boxes = [
      {
        label: isAr ? "Revenue" : "Total Revenue",
        value: `${revenue.toLocaleString(dateLocale)} EGP`,
      },
      {
        label: isAr ? "Invoices" : "Invoices Issued",
        value: invoicesCount.toLocaleString(dateLocale),
      },
      {
        label: isAr ? "Completed" : "Completed Visits",
        value: completedCount.toLocaleString(dateLocale),
      },
      {
        label: isAr ? "Pending" : "Pending Appointments",
        value: pendingCount.toLocaleString(dateLocale),
      },
    ];
    const boxW = contentW / 2 - 3;
    const boxH = 18;
    boxes.forEach((box, i) => {
      const col = i % 2;
      const rowIdx = Math.floor(i / 2);
      const bx = marginL + col * (boxW + 6);
      const by = y + rowIdx * (boxH + 4);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(200, 210, 230);
      doc.roundedRect(bx, by, boxW, boxH, 2, 2, "FD");

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 120);
      doc.text(box.label.toUpperCase(), bx + 4, by + 6);

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text(box.value, bx + 4, by + 14);
    });
    y += 2 * (boxH + 4) + 8;

    divider();

    // ── Monthly Revenue ───────────────────────────────────────────────
    if (monthlyRevenue.length > 0) {
      sectionTitle("Monthly Revenue");

      // Simple bar chart
      const maxVal = Math.max(...monthlyRevenue.map(([, v]) => v), 1);
      const barMaxW = contentW - 40;
      monthlyRevenue.forEach(([month, amount]) => {
        const barW = (amount / maxVal) * barMaxW;
        doc.setFillColor(30, 58, 138);
        doc.rect(marginL + 30, y - 4, barW, 5, "F");

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(month, marginL, y);

        doc.setTextColor(20, 20, 20);
        doc.setFont("helvetica", "bold");
        doc.text(
          `${amount.toLocaleString(dateLocale)} EGP`,
          pageW - marginR,
          y,
          {
            align: "right",
          },
        );
        y += 9;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
      y += 4;
      divider();
    }

    // ── Payment Methods ───────────────────────────────────────────────
    const paymentEntries = Object.entries(paymentBreakdown);
    if (paymentEntries.length > 0) {
      sectionTitle("Payment Methods");
      const totalPay = paymentEntries.reduce((s, [, v]) => s + v, 0);
      const labels: Record<string, string> = {
        cash: "Cash",
        vodafone_cash: isAr ? "Vodafone Cash" : "Vodafone Cash",
        CASH: "Cash",
        VODAFONE_CASH: "Vodafone Cash",
      };
      paymentEntries
        .filter(([method]) =>
          ["cash", "vodafone_cash", "CASH", "VODAFONE_CASH"].includes(method),
        )
        .forEach(([method, amount]) => {
          const pct = totalPay > 0 ? Math.round((amount / totalPay) * 100) : 0;
          const barW = (amount / (totalPay || 1)) * (contentW - 60);
          doc.setFillColor(99, 162, 235);
          doc.rect(marginL + 28, y - 4, barW, 5, "F");

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60, 60, 60);
          doc.text(labels[method] ?? method, marginL, y);

          doc.setFont("helvetica", "bold");
          doc.setTextColor(20, 20, 20);
          doc.text(
            `${amount.toLocaleString(dateLocale)} EGP  (${pct.toLocaleString(dateLocale)}%)`,
            pageW - marginR,
            y,
            { align: "right" },
          );
          y += 9;
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        });
      y += 4;
      divider();
    }

    // ── Cases by Doctor ───────────────────────────────────────────────
    if (casesByDoctor.length > 0) {
      sectionTitle("Cases by Doctor");
      casesByDoctor.forEach((item) => {
        row(
          item.doctor,
          `${item.count.toLocaleString(dateLocale)} ${isAr ? "cases" : "cases"}`,
        );
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
      y += 4;
      divider();
    }

    // ── Footer ────────────────────────────────────────────────────────
    const pageCount = (
      doc as unknown as { internal: { getNumberOfPages: () => number } }
    ).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}  ·  Clinic Management System  ·  ${dateStr}`,
        pageW / 2,
        292,
        { align: "center" },
      );
    }

    doc.save(`clinic-report-${today.toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <Button type="button" variant="secondary" onClick={downloadReport}>
      {isAr ? "تحميل تقرير PDF ↓" : "Download PDF Report ↓"}
    </Button>
  );
}
