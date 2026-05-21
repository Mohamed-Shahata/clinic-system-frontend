"use client";

import { jsPDF } from "jspdf";
import { Button } from "@/components/ui";

type ReportsPdfButtonProps = {
  locale: string;
  clinicName?: string;
  clinicNameEn?: string;
  revenue: number;
  invoicesCount: number;
  completedCount: number;
  casesByDoctor: Array<{ doctor: string; count: number }>;
  monthlyRevenue?: Array<[string, number]>;
  paymentBreakdown?: Record<string, number>;
  pendingCount?: number;
  avgRevenuePerInvoice?: number;
  topPaymentMethod?: string;
};

export function ReportsPdfButton({
  clinicName,
  clinicNameEn,
  revenue,
  invoicesCount,
  completedCount,
  casesByDoctor,
  monthlyRevenue = [],
  paymentBreakdown = {},
  pendingCount = 0,
}: ReportsPdfButtonProps) {
  // jsPDF doesn't support Arabic Unicode — strip non-ASCII or use the English name
  const safeClinicName = clinicNameEn
    ? clinicNameEn
    : (clinicName ?? "").replace(/[^\x00-\x7F]/g, "").trim() || "Clinic";

  function downloadReport() {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const W = 210;
    const ML = 16;
    const MR = 16;
    const CW = W - ML - MR;
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    let y = 0;

    // ── colour palette ────────────────────────────────────────────────────────
    const NAVY = [15, 40, 90] as [number, number, number];
    const BLUE = [37, 99, 235] as [number, number, number];
    const LBLUE = [219, 234, 254] as [number, number, number];
    const GREEN = [16, 185, 129] as [number, number, number];
    const ORANGE = [245, 158, 11] as [number, number, number];
    const RED = [239, 68, 68] as [number, number, number];
    const LGRAY = [245, 247, 250] as [number, number, number];
    const MGRAY = [148, 163, 184] as [number, number, number];
    const DTEXT = [15, 23, 42] as [number, number, number];

    // ── helpers ───────────────────────────────────────────────────────────────
    const setColor = (r: number, g: number, b: number) =>
      doc.setTextColor(r, g, b);
    const setFill = (c: [number, number, number]) => doc.setFillColor(...c);
    const setDraw = (c: [number, number, number]) => doc.setDrawColor(...c);

    function text(
      t: string,
      x: number,
      yy: number,
      opts?: Parameters<typeof doc.text>[3],
    ) {
      doc.text(t, x, yy, opts);
    }

    function newPageIfNeeded(needed = 20) {
      if (y + needed > 278) {
        doc.addPage();
        y = 20;
      }
    }

    // ── COVER BAND ────────────────────────────────────────────────────────────
    setFill(NAVY);
    doc.rect(0, 0, W, 48, "F");

    // accent stripe
    setFill(BLUE);
    doc.rect(0, 0, 7, 48, "F");

    setColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    text("CLINIC PERFORMANCE REPORT", ML + 4, 18);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(200, 215, 255);
    text(`Clinic: ${safeClinicName}`, ML + 4, 27);
    text(`Report Date: ${dateStr}`, ML + 4, 33);
    text(`Period: Last 6 Months`, ML + 4, 39);

    y = 60;

    // ── KPI CARDS (2 × 2 grid) ────────────────────────────────────────────────
    const kpis = [
      {
        label: "TOTAL REVENUE",
        value: `${revenue.toLocaleString("en-GB")} EGP`,
        color: BLUE,
        accent: LBLUE,
      },
      {
        label: "INVOICES ISSUED",
        value: String(invoicesCount),
        color: GREEN,
        accent: [209, 250, 229] as [number, number, number],
      },
      {
        label: "COMPLETED VISITS",
        value: String(completedCount),
        color: ORANGE,
        accent: [254, 243, 199] as [number, number, number],
      },
      {
        label: "PENDING APPTS",
        value: String(pendingCount),
        color: RED,
        accent: [254, 226, 226] as [number, number, number],
      },
    ];

    const boxW = (CW - 6) / 2;
    const boxH = 22;

    kpis.forEach((kpi, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = ML + col * (boxW + 6);
      const by = y + row * (boxH + 5);

      // card
      setFill(kpi.accent);
      setDraw([220, 230, 245]);
      doc.roundedRect(bx, by, boxW, boxH, 3, 3, "FD");

      // left accent bar
      setFill(kpi.color);
      doc.roundedRect(bx, by, 4, boxH, 2, 2, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setColor(...MGRAY);
      text(kpi.label, bx + 9, by + 7);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      setColor(...kpi.color);
      text(kpi.value, bx + 9, by + 17);
    });

    y += 2 * (boxH + 5) + 10;

    // ── average per invoice ───────────────────────────────────────────────────
    if (invoicesCount > 0) {
      const avg = Math.round(revenue / invoicesCount);
      setFill(LGRAY);
      doc.roundedRect(ML, y, CW, 10, 2, 2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setColor(...DTEXT);
      text("Average Revenue per Invoice:", ML + 4, y + 7);
      doc.setFont("helvetica", "bold");
      text(`${avg.toLocaleString("en-GB")} EGP`, W - MR, y + 7, {
        align: "right",
      });
      y += 16;
    }

    // ── MONTHLY REVENUE ───────────────────────────────────────────────────────
    if (monthlyRevenue.length > 0) {
      newPageIfNeeded(60);

      // section header
      setFill(LGRAY);
      doc.rect(ML, y - 2, CW, 9, "F");
      setFill(BLUE);
      doc.rect(ML, y - 2, 4, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      setColor(...NAVY);
      text("MONTHLY REVENUE", ML + 8, y + 4);
      y += 14;

      const maxVal = Math.max(...monthlyRevenue.map(([, v]) => v), 1);
      const barMaxW = CW - 52;
      const barH = 6;
      const rowH = 12;

      monthlyRevenue.forEach(([month, amount]) => {
        newPageIfNeeded(rowH + 2);
        const barW = Math.max((amount / maxVal) * barMaxW, 1);
        const pct = Math.round((amount / maxVal) * 100);

        // bg track
        setFill([235, 240, 255]);
        doc.roundedRect(ML + 22, y - 4, barMaxW, barH, 1.5, 1.5, "F");

        // filled bar
        setFill(BLUE);
        doc.roundedRect(ML + 22, y - 4, barW, barH, 1.5, 1.5, "F");

        // labels
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        setColor(...NAVY);
        text(month, ML, y + 0.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        setColor(...MGRAY);
        text(`${pct}%`, ML + 22 + barMaxW + 2, y + 0.5);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        setColor(...DTEXT);
        text(`${amount.toLocaleString("en-GB")} EGP`, W - MR, y + 0.5, {
          align: "right",
        });

        y += rowH;
      });
      y += 6;
    }

    // ── PAYMENT METHODS ───────────────────────────────────────────────────────
    const payEntries = Object.entries(paymentBreakdown).filter(([m]) =>
      [
        "cash",
        "vodafone_cash",
        "CASH",
        "VODAFONE_CASH",
        "card",
        "CARD",
      ].includes(m),
    );
    const methodLabel: Record<string, string> = {
      cash: "Cash",
      CASH: "Cash",
      vodafone_cash: "Vodafone Cash",
      VODAFONE_CASH: "Vodafone Cash",
      card: "Card",
      CARD: "Card",
    };

    if (payEntries.length > 0) {
      newPageIfNeeded(40);

      setFill(LGRAY);
      doc.rect(ML, y - 2, CW, 9, "F");
      setFill(GREEN);
      doc.rect(ML, y - 2, 4, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      setColor(...NAVY);
      text("PAYMENT METHODS", ML + 8, y + 4);
      y += 14;

      const totalPay = payEntries.reduce((s, [, v]) => s + v, 0);
      const colors: [number, number, number][] = [BLUE, GREEN, ORANGE];

      payEntries.forEach(([method, amount], i) => {
        newPageIfNeeded(13);
        const pct = totalPay > 0 ? Math.round((amount / totalPay) * 100) : 0;
        const barW = Math.max((amount / (totalPay || 1)) * (CW - 52), 1);

        // bg track
        setFill([240, 245, 255]);
        doc.roundedRect(ML + 30, y - 4, CW - 52, 6, 1.5, 1.5, "F");

        // filled
        setFill(colors[i % colors.length]);
        doc.roundedRect(ML + 30, y - 4, barW, 6, 1.5, 1.5, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        setColor(...DTEXT);
        text(methodLabel[method] ?? method, ML, y + 0.5);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        setColor(...colors[i % colors.length]);
        text(`${amount.toLocaleString("en-GB")} EGP`, W - MR - 18, y + 0.5, {
          align: "right",
        });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        setColor(...MGRAY);
        text(`${pct}%`, W - MR, y + 0.5, { align: "right" });

        y += 13;
      });
      y += 6;
    }

    // ── CASES BY DOCTOR ───────────────────────────────────────────────────────
    if (casesByDoctor.length > 0) {
      newPageIfNeeded(40);

      setFill(LGRAY);
      doc.rect(ML, y - 2, CW, 9, "F");
      setFill(ORANGE);
      doc.rect(ML, y - 2, 4, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      setColor(...NAVY);
      text("CASES BY DOCTOR", ML + 8, y + 4);
      y += 14;

      const maxCases = Math.max(...casesByDoctor.map((d) => d.count), 1);

      casesByDoctor.forEach((item, i) => {
        newPageIfNeeded(12);
        const rowBg =
          i % 2 === 0 ? LGRAY : ([255, 255, 255] as [number, number, number]);
        setFill(rowBg);
        doc.rect(ML, y - 5, CW, 10, "F");

        const dotColors: [number, number, number][] = [
          BLUE,
          GREEN,
          ORANGE,
          RED,
        ];
        setFill(dotColors[i % dotColors.length]);
        doc.circle(ML + 3, y + 0, 1.5, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setColor(...DTEXT);
        text(
          item.doctor.replace(/[^\x00-\x7F]/g, "").trim() || `Doctor ${i + 1}`,
          ML + 8,
          y + 0.5,
        );

        // mini bar
        const bw = (item.count / maxCases) * 40;
        setFill(dotColors[i % dotColors.length]);
        doc.roundedRect(W - MR - 55, y - 3, bw, 5, 1, 1, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        setColor(...dotColors[i % dotColors.length]);
        text(`${item.count} cases`, W - MR, y + 0.5, { align: "right" });

        y += 11;
      });
      y += 6;
    }

    // ── SUMMARY TABLE ─────────────────────────────────────────────────────────
    newPageIfNeeded(50);
    setFill(LGRAY);
    doc.rect(ML, y - 2, CW, 9, "F");
    setFill(NAVY);
    doc.rect(ML, y - 2, 4, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    setColor(...NAVY);
    text("FINANCIAL SUMMARY", ML + 8, y + 4);
    y += 14;

    const summaryRows: [string, string][] = [
      ["Total Invoiced", `${revenue.toLocaleString("en-GB")} EGP`],
      ["Invoices Count", String(invoicesCount)],
      ["Completed Visits", String(completedCount)],
      ["Pending Appointments", String(pendingCount)],
      ...(invoicesCount > 0
        ? [
            [
              "Avg per Invoice",
              `${Math.round(revenue / invoicesCount).toLocaleString("en-GB")} EGP`,
            ] as [string, string],
          ]
        : []),
    ];

    summaryRows.forEach(([label, value], i) => {
      const bg =
        i % 2 === 0 ? LGRAY : ([255, 255, 255] as [number, number, number]);
      setFill(bg);
      doc.rect(ML, y - 5, CW, 9, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setColor(70, 80, 100);
      text(label, ML + 4, y + 0.5);

      doc.setFont("helvetica", "bold");
      setColor(...DTEXT);
      text(value, W - MR, y + 0.5, { align: "right" });

      y += 9;
    });

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const pages = (
      doc as unknown as { internal: { getNumberOfPages: () => number } }
    ).internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      setFill(NAVY);
      doc.rect(0, 287, W, 10, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setColor(180, 200, 240);
      text(
        `Clinic Management System  ·  ${dateStr}  ·  Confidential`,
        ML + 4,
        293,
      );
      setColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      text(`${i} / ${pages}`, W - MR, 293, { align: "right" });
    }

    doc.save(`clinic-report-${today.toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <Button type="button" variant="secondary" onClick={downloadReport}>
      Download PDF Report ↓
    </Button>
  );
}
