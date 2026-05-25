/**
 * prescription-pdf.ts
 * ─────────────────────────────────────────────
 * يولّد HTML احترافي للروشتة بالعربي أو الإنجليزي
 * يُستخدم مع window.open + window.print()
 * يدعم RTL بالكامل بدون قطع الحروف
 */

export type PrescriptionLang = "ar" | "en";

export interface PrescriptionPDFData {
  patient: {
    fullName: string;
    code?: string;
    phone?: string | null;
    age?: number | null;
    dateOfBirth?: string | null;
  };
  doctor: {
    fullName: string;
    specialty?: string | null;
  };
  clinic: {
    name: string;
    logoUrl?: string | null;
    address?: string | null;
    phone?: string | null;
  };
  diagnosis?: string;
  medications: Array<{
    name: string;
    dose?: string;
    frequency?: string;
    duration?: string;
    notes?: string;
  }>;
  labTests?: string[];
  imaging?: string[];
  notes?: string;
  issuedAt: string;
}

function fmtDate(iso: string, lang: PrescriptionLang) {
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function logoHtml(logoUrl?: string | null) {
  if (logoUrl) {
    return `<img src="${logoUrl}" alt="logo" style="width:60px;height:60px;object-fit:contain;border-radius:8px">`;
  }
  return `<div style="width:60px;height:60px;background:#1e3a8a;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700">+</div>`;
}

export function buildPrescriptionPDF(
  data: PrescriptionPDFData,
  lang: PrescriptionLang = "ar",
): string {
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const align = isAr ? "right" : "left";

  const t = {
    prescription: isAr ? "روشتة طبية" : "Medical Prescription",
    patient: isAr ? "بيانات المريض" : "Patient Information",
    name: isAr ? "الاسم" : "Name",
    code: isAr ? "الكود" : "Code",
    phone: isAr ? "الهاتف" : "Phone",
    age: isAr ? "العمر" : "Age",
    years: isAr ? "سنة" : "y",
    date: isAr ? "التاريخ" : "Date",
    doctor: isAr ? "الطبيب" : "Doctor",
    specialty: isAr ? "التخصص" : "Specialty",
    diagnosis: isAr ? "التشخيص" : "Diagnosis",
    medications: isAr ? "الأدوية" : "Medications",
    dose: isAr ? "الجرعة" : "Dose",
    frequency: isAr ? "التكرار" : "Frequency",
    duration: isAr ? "المدة" : "Duration",
    labTests: isAr ? "تحاليل مطلوبة" : "Lab Tests",
    imaging: isAr ? "أشعة مطلوبة" : "Imaging",
    notes: isAr ? "ملاحظات" : "Notes",
    stamp: isAr ? "توقيع الطبيب" : "Doctor Signature",
    footer: isAr
      ? "هذه الروشتة صالحة لمدة شهر من تاريخ الإصدار"
      : "This prescription is valid for one month from the date of issue",
  };

  const medRows = data.medications
    .map(
      (m, i) => `
    <tr style="background:${i % 2 === 0 ? "#f8faff" : "#fff"}">
      <td style="padding:10px 14px;font-weight:600;color:#1e3a8a;border:1px solid #e2e8f0">${m.name}</td>
      <td style="padding:10px 14px;border:1px solid #e2e8f0">${m.dose ?? "—"}</td>
      <td style="padding:10px 14px;border:1px solid #e2e8f0">${m.frequency ?? "—"}</td>
      <td style="padding:10px 14px;border:1px solid #e2e8f0">${m.duration ?? "—"}</td>
      ${m.notes ? `<td style="padding:10px 14px;color:#64748b;font-size:11px;border:1px solid #e2e8f0">${m.notes}</td>` : `<td style="border:1px solid #e2e8f0"></td>`}
    </tr>
  `,
    )
    .join("");

  const labSection = data.labTests?.length
    ? `
    <div style="margin-top:22px">
      <div style="font-weight:700;color:#1e3a8a;font-size:13px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0">${t.labTests}</div>
      <ul style="list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:6px">
        ${data.labTests.map((l) => `<li style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:5px 12px;font-size:12px;color:#1e40af">🧪 ${l}</li>`).join("")}
      </ul>
    </div>
  `
    : "";

  const imagingSection = data.imaging?.length
    ? `
    <div style="margin-top:18px">
      <div style="font-weight:700;color:#1e3a8a;font-size:13px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0">${t.imaging}</div>
      <ul style="list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:6px">
        ${data.imaging.map((img) => `<li style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:5px 12px;font-size:12px;color:#166534">🩻 ${img}</li>`).join("")}
      </ul>
    </div>
  `
    : "";

  const notesSection = data.notes
    ? `
    <div style="margin-top:18px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px">
      <div style="font-weight:700;color:#92400e;font-size:12px;margin-bottom:4px">⚠ ${t.notes}</div>
      <div style="color:#78350f;font-size:13px">${data.notes}</div>
    </div>
  `
    : "";

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.prescription} — ${data.patient.fullName}</title>
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
  .section-title{font-weight:700;color:#1e3a8a;font-size:13px;margin-bottom:10px;padding-bottom:5px;border-bottom:2px solid #1e3a8a;display:flex;align-items:center;gap:6px}
</style>
</head>
<body>

<!-- ── PRINT BUTTON ── -->
<div class="no-print" style="margin-bottom:20px;display:flex;gap:8px">
  <button onclick="window.print()" style="background:#1e3a8a;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">
    ${isAr ? "🖨 طباعة" : "🖨 Print"}
  </button>
  <button onclick="window.close()" style="background:#f1f5f9;color:#475569;border:none;padding:8px 16px;border-radius:8px;font-family:inherit;font-size:13px;cursor:pointer">
    ${isAr ? "إغلاق" : "Close"}
  </button>
</div>

<!-- ── HEADER ── -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #1e3a8a;margin-bottom:22px">
  <div style="display:flex;align-items:center;gap:14px">
    ${logoHtml(data.clinic.logoUrl)}
    <div>
      <div style="font-size:20px;font-weight:800;color:#1e3a8a">${data.clinic.name}</div>
      ${data.clinic.address ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${data.clinic.address}</div>` : ""}
      ${data.clinic.phone ? `<div style="font-size:11px;color:#64748b">${data.clinic.phone}</div>` : ""}
    </div>
  </div>
  <div style="text-align:${isAr ? "left" : "right"}">
    <div style="font-size:28px;font-weight:800;color:#1e3a8a;opacity:.12;letter-spacing:-1px;line-height:1">Rx</div>
    <div style="font-size:11px;color:#64748b;margin-top:6px">${t.date}: <strong>${fmtDate(data.issuedAt, lang)}</strong></div>
    <div style="font-size:11px;color:#64748b">${t.doctor}: <strong>${data.doctor.fullName}</strong></div>
    ${data.doctor.specialty ? `<div style="font-size:11px;color:#64748b">${t.specialty}: ${data.doctor.specialty}</div>` : ""}
  </div>
</div>

<!-- ── PATIENT BOX ── -->
<div style="background:#f0f4ff;border:1px solid #c7d7f7;border-radius:10px;padding:14px 18px;margin-bottom:22px">
  <div class="section-title">👤 ${t.patient}</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
    <div><div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase">${t.name}</div><div style="font-weight:700;font-size:14px">${data.patient.fullName}</div></div>
    ${data.patient.code ? `<div><div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase">${t.code}</div><div style="font-weight:600">${data.patient.code}</div></div>` : ""}
    ${data.patient.age != null ? `<div><div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase">${t.age}</div><div style="font-weight:600">${data.patient.age} ${t.years}</div></div>` : ""}
    ${data.patient.phone ? `<div><div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase">${t.phone}</div><div style="font-weight:600">${data.patient.phone}</div></div>` : ""}
  </div>
</div>

<!-- ── DIAGNOSIS ── -->
${
  data.diagnosis
    ? `
<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin-bottom:22px">
  <span style="font-weight:700;color:#9a3412">🩺 ${t.diagnosis}: </span>
  <span style="color:#7c2d12;font-size:14px;font-weight:600">${data.diagnosis}</span>
</div>
`
    : ""
}

<!-- ── MEDICATIONS ── -->
${
  data.medications.length
    ? `
<div style="margin-bottom:22px">
  <div class="section-title">💊 ${t.medications}</div>
  <table>
    <thead>
      <tr>
        <th>${isAr ? "الدواء" : "Medication"}</th>
        <th>${t.dose}</th>
        <th>${t.frequency}</th>
        <th>${t.duration}</th>
        <th>${isAr ? "ملاحظة" : "Note"}</th>
      </tr>
    </thead>
    <tbody>${medRows}</tbody>
  </table>
</div>
`
    : ""
}

${labSection}
${imagingSection}
${notesSection}

<!-- ── SIGNATURE ── -->
<div style="margin-top:40px;display:flex;justify-content:${isAr ? "flex-start" : "flex-end"}">
  <div style="text-align:center;min-width:160px">
    <div style="height:48px;border-bottom:1px solid #94a3b8;margin-bottom:6px"></div>
    <div style="font-size:11px;color:#64748b">${t.stamp}</div>
    <div style="font-weight:700;color:#1e3a8a;font-size:13px">${data.doctor.fullName}</div>
    ${data.doctor.specialty ? `<div style="font-size:11px;color:#64748b">${data.doctor.specialty}</div>` : ""}
  </div>
</div>

<!-- ── FOOTER ── -->
<div style="margin-top:28px;padding-top:12px;border-top:1px dashed #e2e8f0;text-align:center;font-size:10px;color:#94a3b8">
  ${t.footer}
</div>

</body>
</html>`;
}
