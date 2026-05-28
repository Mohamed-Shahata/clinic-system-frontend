/**
 * invoice-pdf.ts
 * ──────────────────────────────────────────────
 * يولّد HTML احترافي للفاتورة بالعربي أو الإنجليزي
 * يُستخدم مع window.open + window.print()
 */

export type InvoiceLang = "ar" | "en";

export interface InvoicePDFData {
  invoice: {
    id: string;
    totalAmount: number;
    paidAmount: number;
    status?: string;
    paymentMethod: string;
    notes?: string | null;
    createdAt: string;
    services: Array<{ name: string; amount: number | string; qty?: number }>;
  };
  patient: {
    fullName: string;
    code: string;
    phone?: string | null;
  };
  clinic: {
    name: string;
    logoUrl?: string | null;
    address?: string | null;
    phone?: string | null;
  };
  doctor?: {
    fullName: string;
    specialty?: string | null;
  } | null;
}

function fmtDate(iso: string, lang: InvoiceLang) {
  return new Date(iso).toLocaleDateString(
    lang === "ar" ? "ar-EG" : "en-GB",
    { day: "2-digit", month: "long", year: "numeric" },
  );
}

function fmtTime(iso: string, lang: InvoiceLang) {
  return new Date(iso).toLocaleTimeString(
    lang === "ar" ? "ar-EG" : "en-GB",
    { hour: "2-digit", minute: "2-digit", hour12: lang === "ar" },
  );
}

function fmtMoney(n: number, lang: InvoiceLang) {
  return n.toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function payMethodLabel(method: string, lang: InvoiceLang) {
  const ar: Record<string, string> = {
    cash: "كاش",
    vodafone_cash: "فودافون كاش",
    transfer: "تحويل بنكي",
    insurance: "تأمين طبي",
    check: "شيك",
  };
  const en: Record<string, string> = {
    cash: "Cash",
    vodafone_cash: "Vodafone Cash",
    transfer: "Bank Transfer",
    insurance: "Insurance",
    check: "Check",
  };
  const map = lang === "ar" ? ar : en;
  return map[method.toLowerCase()] ?? method;
}

function statusLabel(status: string | undefined, lang: InvoiceLang) {
  if (!status || status === "PAID") return lang === "ar" ? "مدفوع" : "Paid";
  if (status === "PARTIAL") return lang === "ar" ? "جزئي" : "Partial";
  return lang === "ar" ? "غير مدفوع" : "Unpaid";
}

function statusColor(status: string | undefined) {
  if (!status || status === "PAID") return "#16a34a";
  if (status === "PARTIAL") return "#d97706";
  return "#dc2626";
}

export function buildInvoicePDF(
  data: InvoicePDFData,
  lang: InvoiceLang = "ar",
): string {
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const align = isAr ? "right" : "left";

  const t = {
    invoice:     isAr ? "فاتورة"              : "Invoice",
    invoiceNo:   isAr ? "رقم الفاتورة"        : "Invoice No.",
    date:        isAr ? "التاريخ"             : "Date",
    time:        isAr ? "الوقت"               : "Time",
    patient:     isAr ? "المريض"              : "Patient",
    code:        isAr ? "الكود"               : "Code",
    phone:       isAr ? "الهاتف"             : "Phone",
    doctor:      isAr ? "الطبيب"              : "Doctor",
    specialty:   isAr ? "التخصص"             : "Specialty",
    services:    isAr ? "الخدمات"             : "Services",
    service:     isAr ? "الخدمة"              : "Service",
    qty:         isAr ? "الكمية"              : "Qty",
    unitPrice:   isAr ? "السعر"               : "Price",
    total:       isAr ? "الإجمالي"            : "Total",
    subtotal:    isAr ? "المجموع"             : "Subtotal",
    paid:        isAr ? "المدفوع"             : "Paid",
    remaining:   isAr ? "المتبقي"             : "Remaining",
    payMethod:   isAr ? "طريقة الدفع"         : "Payment Method",
    status:      isAr ? "الحالة"              : "Status",
    notes:       isAr ? "ملاحظات"             : "Notes",
    footer:      isAr ? "شكراً لثقتكم — هذه الفاتورة صادرة إلكترونياً" : "Thank you — This invoice was issued electronically",
    print:       isAr ? "🖨 طباعة"            : "🖨 Print",
    close:       isAr ? "إغلاق"              : "Close",
  };

  const remaining = data.invoice.totalAmount - data.invoice.paidAmount;
  const services = data.invoice.services ?? [];
  const invoiceShort = data.invoice.id.slice(-8).toUpperCase();

  const serviceRows = services.map((s, i) => {
    const amt = Number(s.amount);
    const qty = s.qty ?? 1;
    return `
      <tr style="background:${i % 2 === 0 ? "#f8faff" : "#fff"}">
        <td style="padding:10px 14px;border:1px solid #e2e8f0">${s.name}</td>
        <td style="padding:10px 14px;text-align:center;border:1px solid #e2e8f0">${qty}</td>
        <td style="padding:10px 14px;text-align:${align};font-family:monospace;border:1px solid #e2e8f0">${fmtMoney(amt / qty, lang)}</td>
        <td style="padding:10px 14px;text-align:${align};font-family:monospace;font-weight:600;border:1px solid #e2e8f0">${fmtMoney(amt, lang)}</td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8">
<title>${t.invoice} ${invoiceShort} — ${data.patient.fullName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{
    font-family:${isAr ? "'Cairo','Inter'" : "'Inter','Cairo'"},sans-serif;
    background:#fff;color:#1a1a2e;font-size:13px;line-height:1.7;
    padding:32px 40px;direction:${dir};text-align:${align}
  }
  @media print{
    body{padding:20px 28px}
    .no-print{display:none!important}
    @page{margin:12mm;size:A4}
  }
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#1e3a8a;color:#fff;padding:10px 14px;font-weight:600;text-align:${align}}
  .section-title{font-weight:700;color:#1e3a8a;font-size:13px;margin-bottom:10px;padding-bottom:5px;border-bottom:2px solid #1e3a8a}
</style>
</head>
<body>

<!-- ── PRINT BUTTON ── -->
<div class="no-print" style="margin-bottom:20px;display:flex;gap:8px">
  <button onclick="window.print()" style="background:#1e3a8a;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${t.print}</button>
  <button onclick="window.close()" style="background:#f1f5f9;color:#475569;border:none;padding:8px 16px;border-radius:8px;font-family:inherit;font-size:13px;cursor:pointer">${t.close}</button>
</div>

<!-- ── HEADER ── -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #1e3a8a;margin-bottom:22px">
  <div style="display:flex;align-items:center;gap:14px">
    <div style="width:56px;height:56px;background:#1e3a8a;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:26px;font-weight:700">₪</div>
    <div>
      <div style="font-size:20px;font-weight:800;color:#1e3a8a">${data.clinic.name}</div>
      ${data.clinic.address ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${data.clinic.address}</div>` : ""}
      ${data.clinic.phone ? `<div style="font-size:11px;color:#64748b">${data.clinic.phone}</div>` : ""}
    </div>
  </div>
  <div style="text-align:${isAr ? "left" : "right"}">
    <div style="font-size:22px;font-weight:800;color:#1e3a8a">${t.invoice}</div>
    <div style="font-size:12px;font-family:monospace;color:#64748b;margin-top:4px">#${invoiceShort}</div>
    <div style="font-size:11px;color:#64748b;margin-top:4px">
      ${t.date}: <strong>${fmtDate(data.invoice.createdAt, lang)}</strong>
    </div>
    <div style="font-size:11px;color:#64748b">
      ${t.time}: <strong>${fmtTime(data.invoice.createdAt, lang)}</strong>
    </div>
    <div style="margin-top:6px;display:inline-block;background:${statusColor(data.invoice.status)}20;border:1px solid ${statusColor(data.invoice.status)}40;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700;color:${statusColor(data.invoice.status)}">
      ${statusLabel(data.invoice.status, lang)}
    </div>
  </div>
</div>

<!-- ── PATIENT + DOCTOR ── -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px">
  <div style="background:#f0f4ff;border:1px solid #c7d7f7;border-radius:10px;padding:14px 16px">
    <div class="section-title">👤 ${t.patient}</div>
    <div style="font-size:15px;font-weight:700">${data.patient.fullName}</div>
    <div style="font-size:12px;color:#64748b;margin-top:2px">${t.code}: <span style="font-family:monospace">${data.patient.code}</span></div>
    ${data.patient.phone ? `<div style="font-size:12px;color:#64748b">${t.phone}: ${data.patient.phone}</div>` : ""}
  </div>
  ${data.doctor ? `
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px">
    <div style="font-weight:700;color:#166534;font-size:13px;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #166534">🩺 ${t.doctor}</div>
    <div style="font-size:15px;font-weight:700">${data.doctor.fullName}</div>
    ${data.doctor.specialty ? `<div style="font-size:12px;color:#64748b;margin-top:2px">${t.specialty}: ${data.doctor.specialty}</div>` : ""}
  </div>
  ` : "<div></div>"}
</div>

<!-- ── SERVICES TABLE ── -->
${services.length > 0 ? `
<div style="margin-bottom:22px">
  <div class="section-title">📋 ${t.services}</div>
  <table>
    <thead>
      <tr>
        <th>${t.service}</th>
        <th style="text-align:center;width:60px">${t.qty}</th>
        <th style="text-align:${align};width:120px">${t.unitPrice}</th>
        <th style="text-align:${align};width:120px">${t.total}</th>
      </tr>
    </thead>
    <tbody>${serviceRows}</tbody>
  </table>
</div>
` : ""}

<!-- ── TOTALS ── -->
<div style="display:flex;justify-content:${isAr ? "flex-start" : "flex-end"};margin-bottom:22px">
  <div style="min-width:240px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
    <div style="display:flex;justify-content:space-between;padding:10px 16px;background:#f8faff">
      <span style="font-weight:600">${t.subtotal}</span>
      <span style="font-family:monospace;font-weight:700">${fmtMoney(data.invoice.totalAmount, lang)} EGP</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:10px 16px;background:#f0fdf4">
      <span style="font-weight:600;color:#16a34a">✓ ${t.paid}</span>
      <span style="font-family:monospace;font-weight:700;color:#16a34a">${fmtMoney(data.invoice.paidAmount, lang)} EGP</span>
    </div>
    ${remaining > 0 ? `
    <div style="display:flex;justify-content:space-between;padding:10px 16px;background:#fef2f2">
      <span style="font-weight:600;color:#dc2626">⟳ ${t.remaining}</span>
      <span style="font-family:monospace;font-weight:700;color:#dc2626">${fmtMoney(remaining, lang)} EGP</span>
    </div>
    ` : ""}
    <div style="display:flex;justify-content:space-between;padding:10px 16px;border-top:1px solid #e2e8f0">
      <span style="font-weight:600;color:#64748b">${t.payMethod}</span>
      <span style="font-weight:600">${payMethodLabel(data.invoice.paymentMethod, lang)}</span>
    </div>
  </div>
</div>

<!-- ── NOTES ── -->
${data.invoice.notes ? `
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:22px">
  <div style="font-weight:700;color:#92400e;font-size:12px;margin-bottom:4px">⚠ ${t.notes}</div>
  <div style="color:#78350f">${data.invoice.notes}</div>
</div>
` : ""}

<!-- ── FOOTER ── -->
<div style="margin-top:28px;padding-top:12px;border-top:1px dashed #e2e8f0;text-align:center;font-size:10px;color:#94a3b8">
  ${t.footer}
</div>

</body>
</html>`;
}
