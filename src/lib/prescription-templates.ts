/**
 * prescription-templates.ts
 * Three professional prescription PDF templates.
 * All output is English-only (jsPDF / window.print friendly).
 */

export type PrescriptionStyle = "classic" | "modern" | "minimal";

export interface PrescriptionData {
  patient: {
    fullName: string;
    code?: string;
    phone?: string;
    age?: number | null;
  };
  doctor: {
    fullName: string;
    specialty?: string | null;
  };
  clinic: {
    name: string;
    logoUrl?: string | null;
    address?: string;
    phone?: string;
  };
  diagnosis?: string;
  medications: string[];
  labTests?: string[];
  imaging?: string[];
  notes?: string;
  issuedAt: string; // ISO date
}

// ── shared helpers ────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function listItems(items: string[], bullet = "•") {
  return items
    .map(
      (item) =>
        `<li style="margin:3px 0;padding-left:6px">${bullet} ${item}</li>`,
    )
    .join("");
}

function logoHtml(logoUrl?: string | null, size = 56) {
  return logoUrl
    ? `<img src="${logoUrl}" alt="logo"
         style="width:${size}px;height:${size}px;object-fit:contain;border-radius:8px;display:block">`
    : `<div style="width:${size}px;height:${size}px;background:#1e3a8a;border-radius:10px;
         display:flex;align-items:center;justify-content:center;color:white;
         font-size:${size * 0.5}px;font-weight:700;line-height:1">+</div>`;
}

// ── CLASSIC template ──────────────────────────────────────────────────────────
function classicTemplate(d: PrescriptionData): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<title>Prescription — ${d.patient.fullName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#fff;color:#1a1a2e;font-size:13px;line-height:1.6;padding:40px 48px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #1e3a8a;margin-bottom:24px}
  .clinic-info{display:flex;align-items:center;gap:14px}
  .clinic-text .name{font-size:18px;font-weight:700;color:#1e3a8a}
  .clinic-text .sub{font-size:11px;color:#64748b;margin-top:2px}
  .rx-stamp{font-family:Georgia,serif;font-size:40px;font-weight:700;color:#1e3a8a;opacity:.15;letter-spacing:-2px}
  .meta{text-align:right;font-size:11px;color:#64748b;line-height:1.8}
  .patient-box{background:#f0f4ff;border:1px solid #c7d7f7;border-radius:10px;padding:16px 20px;margin-bottom:22px}
  .patient-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  .pf label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;display:block}
  .pf span{font-size:14px;font-weight:600;color:#1a1a2e;display:block;margin-top:2px}
  .section{margin-bottom:20px}
  .section-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}
  .section-head .icon{width:28px;height:28px;border-radius:6px;background:#1e3a8a;display:flex;align-items:center;justify-content:center;color:white;font-size:13px;flex-shrink:0}
  .section-head h3{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1e3a8a}
  ul{list-style:none;padding:0;background:#fafbff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px}
  li{border-bottom:1px solid #f0f0f8;padding:5px 0;font-size:12.5px}
  li:last-child{border-bottom:none}
  .diagnosis-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:13px}
  .footer{margin-top:36px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}
  .sig-line{width:140px;border-bottom:1.5px solid #1e3a8a;margin-bottom:4px}
  @media print{body{padding:24px}}
</style>
</head>
<body>

<div class="header">
  <div class="clinic-info">
    ${logoHtml(d.clinic.logoUrl, 52)}
    <div class="clinic-text">
      <div class="name">${d.clinic.name}</div>
      <div class="sub">Dr. ${d.doctor.fullName}${d.doctor.specialty ? ` · ${d.doctor.specialty}` : ""}</div>
      ${d.clinic.address ? `<div class="sub">${d.clinic.address}</div>` : ""}
    </div>
  </div>
  <div style="display:flex;align-items:flex-start;gap:24px">
    <div class="rx-stamp">Rx</div>
    <div class="meta">
      <div><b>Date:</b> ${fmtDate(d.issuedAt)}</div>
      ${d.clinic.phone ? `<div><b>Tel:</b> ${d.clinic.phone}</div>` : ""}
    </div>
  </div>
</div>

<div class="patient-box">
  <div class="patient-grid">
    <div class="pf"><label>Patient Name</label><span>${d.patient.fullName}</span></div>
    ${d.patient.code ? `<div class="pf"><label>Patient Code</label><span>${d.patient.code}</span></div>` : ""}
    ${d.patient.age != null ? `<div class="pf"><label>Age</label><span>${d.patient.age} years</span></div>` : ""}
    ${d.patient.phone ? `<div class="pf"><label>Phone</label><span dir="ltr">${d.patient.phone}</span></div>` : ""}
  </div>
</div>

${
  d.diagnosis
    ? `
<div class="section">
  <div class="section-head"><div class="icon">⊕</div><h3>Diagnosis</h3></div>
  <div class="diagnosis-box">${d.diagnosis}</div>
</div>`
    : ""
}

${
  d.medications.length
    ? `
<div class="section">
  <div class="section-head"><div class="icon">💊</div><h3>Medications</h3></div>
  <ul>${listItems(d.medications)}</ul>
</div>`
    : ""
}

${
  d.labTests?.length
    ? `
<div class="section">
  <div class="section-head"><div class="icon">🔬</div><h3>Lab Tests</h3></div>
  <ul>${listItems(d.labTests)}</ul>
</div>`
    : ""
}

${
  d.imaging?.length
    ? `
<div class="section">
  <div class="section-head"><div class="icon">📷</div><h3>Imaging</h3></div>
  <ul>${listItems(d.imaging)}</ul>
</div>`
    : ""
}

${
  d.notes
    ? `
<div class="section">
  <div class="section-head"><div class="icon">📝</div><h3>Notes</h3></div>
  <div class="diagnosis-box" style="background:#f8faff;border-color:#c7d7f7">${d.notes}</div>
</div>`
    : ""
}

<div class="footer">
  <div style="font-size:10px;color:#94a3b8">Generated by Clinic Management System · ${fmtDate(new Date().toISOString())}</div>
  <div>
    <div class="sig-line"></div>
    <div style="font-size:10px;color:#64748b">Dr. ${d.doctor.fullName} — Signature</div>
  </div>
</div>

</body></html>`;
}

// ── MODERN template ───────────────────────────────────────────────────────────
function modernTemplate(d: PrescriptionData): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<title>Prescription — ${d.patient.fullName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#fff;color:#0f172a;font-size:13px;line-height:1.6}
  .sidebar{position:fixed;top:0;left:0;width:7px;height:100%;background:linear-gradient(180deg,#0ea5e9,#6366f1)}
  .content{padding:36px 48px 36px 56px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
  .clinic-block{display:flex;align-items:center;gap:14px}
  .clinic-name{font-size:20px;font-weight:700;background:linear-gradient(90deg,#0ea5e9,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .clinic-sub{font-size:11px;color:#64748b;margin-top:3px}
  .date-badge{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:8px 14px;text-align:right;font-size:11px;color:#0369a1}
  .patient-strip{background:linear-gradient(135deg,#f0f9ff,#eff6ff);border-left:4px solid #0ea5e9;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;display:flex;gap:32px;flex-wrap:wrap}
  .pf{display:flex;flex-direction:column}
  .pf label{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#64748b}
  .pf span{font-size:14px;font-weight:600;color:#0f172a;margin-top:1px}
  .card{border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:16px}
  .card-head{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 16px;display:flex;align-items:center;gap:8px}
  .card-head span{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569}
  .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .card-body{padding:14px 16px}
  li{list-style:none;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:12.5px;display:flex;align-items:baseline;gap:8px}
  li::before{content:"→";color:#0ea5e9;font-weight:700;flex-shrink:0}
  li:last-child{border-bottom:none}
  .diag{background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:12px 16px}
  .footer{margin-top:32px;display:grid;grid-template-columns:1fr auto;align-items:end;border-top:1px dashed #e2e8f0;padding-top:16px;font-size:10px;color:#94a3b8}
  .sig-box{text-align:right}
  .sig-line{width:150px;border-bottom:2px solid #0ea5e9;margin-left:auto;margin-bottom:4px}
  @media print{body{padding:0}.sidebar{position:fixed}}
</style>
</head>
<body>
<div class="sidebar"></div>
<div class="content">

<div class="header">
  <div class="clinic-block">
    ${logoHtml(d.clinic.logoUrl, 54)}
    <div>
      <div class="clinic-name">${d.clinic.name}</div>
      <div class="clinic-sub">Dr. ${d.doctor.fullName}${d.doctor.specialty ? ` · ${d.doctor.specialty}` : ""}</div>
      ${d.clinic.address ? `<div class="clinic-sub">${d.clinic.address}</div>` : ""}
    </div>
  </div>
  <div class="date-badge">
    <div style="font-size:10px;color:#64748b;margin-bottom:2px">Issue Date</div>
    <div style="font-weight:600">${fmtDate(d.issuedAt)}</div>
    ${d.clinic.phone ? `<div style="margin-top:4px">${d.clinic.phone}</div>` : ""}
  </div>
</div>

<div class="patient-strip">
  <div class="pf"><label>Patient</label><span>${d.patient.fullName}</span></div>
  ${d.patient.code ? `<div class="pf"><label>Code</label><span>${d.patient.code}</span></div>` : ""}
  ${d.patient.age != null ? `<div class="pf"><label>Age</label><span>${d.patient.age} yrs</span></div>` : ""}
  ${d.patient.phone ? `<div class="pf"><label>Phone</label><span dir="ltr">${d.patient.phone}</span></div>` : ""}
</div>

${
  d.diagnosis
    ? `
<div class="card">
  <div class="card-head"><div class="dot" style="background:#f59e0b"></div><span>Diagnosis</span></div>
  <div class="card-body"><div class="diag">${d.diagnosis}</div></div>
</div>`
    : ""
}

${
  d.medications.length
    ? `
<div class="card">
  <div class="card-head"><div class="dot" style="background:#0ea5e9"></div><span>Medications</span></div>
  <div class="card-body"><ul>${d.medications.map((m) => `<li>${m}</li>`).join("")}</ul></div>
</div>`
    : ""
}

${
  d.labTests?.length
    ? `
<div class="card">
  <div class="card-head"><div class="dot" style="background:#10b981"></div><span>Lab Tests</span></div>
  <div class="card-body"><ul>${d.labTests.map((t) => `<li>${t}</li>`).join("")}</ul></div>
</div>`
    : ""
}

${
  d.imaging?.length
    ? `
<div class="card">
  <div class="card-head"><div class="dot" style="background:#6366f1"></div><span>Imaging</span></div>
  <div class="card-body"><ul>${d.imaging.map((i) => `<li>${i}</li>`).join("")}</ul></div>
</div>`
    : ""
}

${
  d.notes
    ? `
<div class="card">
  <div class="card-head"><div class="dot" style="background:#94a3b8"></div><span>Notes</span></div>
  <div class="card-body" style="color:#475569">${d.notes}</div>
</div>`
    : ""
}

<div class="footer">
  <div>Generated by Clinic Management System · ${fmtDate(new Date().toISOString())}</div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <div>Dr. ${d.doctor.fullName} — Signature</div>
  </div>
</div>

</div>
</body></html>`;
}

// ── MINIMAL template ──────────────────────────────────────────────────────────
function minimalTemplate(d: PrescriptionData): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<title>Prescription — ${d.patient.fullName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#fff;color:#111;font-size:13px;line-height:1.7;padding:40px 52px}
  .header{display:flex;justify-content:space-between;align-items:center;padding-bottom:18px;margin-bottom:22px;border-bottom:2px solid #111}
  .logo-area{display:flex;align-items:center;gap:12px}
  .clinic-name{font-size:17px;font-weight:700;color:#111}
  .clinic-sub{font-size:11px;color:#555;margin-top:2px}
  .rx{font-family:Georgia,serif;font-size:28px;font-weight:700;color:#111;opacity:.25}
  .date{font-size:11px;color:#555;text-align:right}
  .patient-row{display:flex;gap:32px;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid #e5e5e5;margin-bottom:22px}
  .pf label{display:block;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.06em}
  .pf span{font-size:13px;font-weight:600;display:block;margin-top:1px}
  h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#555;margin:18px 0 8px;padding-bottom:4px;border-bottom:1px solid #e5e5e5}
  ul{list-style:none;padding:0}
  li{padding:5px 0 5px 14px;border-bottom:1px solid #f5f5f5;font-size:13px;position:relative}
  li::before{content:"–";position:absolute;left:0;color:#999}
  li:last-child{border-bottom:none}
  .diag{color:#555;font-style:italic;padding:10px 14px;background:#fafafa;border-left:3px solid #111;margin-bottom:4px}
  .footer{margin-top:40px;display:flex;justify-content:space-between;font-size:10px;color:#999;padding-top:14px;border-top:1px solid #e5e5e5}
  .sig-line{width:130px;border-bottom:1.5px solid #111;margin-bottom:4px}
  @media print{body{padding:24px}}
</style>
</head>
<body>

<div class="header">
  <div class="logo-area">
    ${logoHtml(d.clinic.logoUrl, 44)}
    <div>
      <div class="clinic-name">${d.clinic.name}</div>
      <div class="clinic-sub">Dr. ${d.doctor.fullName}${d.doctor.specialty ? ` · ${d.doctor.specialty}` : ""}</div>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:20px">
    <div class="rx">Rx</div>
    <div class="date"><b>${fmtDate(d.issuedAt)}</b>${d.clinic.phone ? `<br>${d.clinic.phone}` : ""}</div>
  </div>
</div>

<div class="patient-row">
  <div class="pf"><label>Patient Name</label><span>${d.patient.fullName}</span></div>
  ${d.patient.code ? `<div class="pf"><label>Code</label><span>${d.patient.code}</span></div>` : ""}
  ${d.patient.age != null ? `<div class="pf"><label>Age</label><span>${d.patient.age} years</span></div>` : ""}
  ${d.patient.phone ? `<div class="pf"><label>Phone</label><span dir="ltr">${d.patient.phone}</span></div>` : ""}
</div>

${d.diagnosis ? `<h3>Diagnosis</h3><div class="diag">${d.diagnosis}</div>` : ""}
${d.medications.length ? `<h3>Medications</h3><ul>${listItems(d.medications, "–")}</ul>` : ""}
${d.labTests?.length ? `<h3>Lab Tests</h3><ul>${listItems(d.labTests, "–")}</ul>` : ""}
${d.imaging?.length ? `<h3>Imaging</h3><ul>${listItems(d.imaging, "–")}</ul>` : ""}
${d.notes ? `<h3>Notes</h3><p style="color:#444;font-size:12.5px">${d.notes}</p>` : ""}

<div class="footer">
  <div>Clinic Management System · ${fmtDate(new Date().toISOString())}</div>
  <div>
    <div class="sig-line"></div>
    Dr. ${d.doctor.fullName} — Signature
  </div>
</div>

</body></html>`;
}

// ── main export ───────────────────────────────────────────────────────────────
export function buildPrescriptionHTML(
  data: PrescriptionData,
  style: PrescriptionStyle = "classic",
): string {
  switch (style) {
    case "modern":
      return modernTemplate(data);
    case "minimal":
      return minimalTemplate(data);
    default:
      return classicTemplate(data);
  }
}

export const PRESCRIPTION_STYLES: Array<{
  id: PrescriptionStyle;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
}> = [
  {
    id: "classic",
    label: "Classic",
    labelAr: "كلاسيكي",
    description: "Clean blue header with structured sections",
    descriptionAr: "هيدر أزرق أنيق مع أقسام منظمة",
  },
  {
    id: "modern",
    label: "Modern",
    labelAr: "حديث",
    description: "Gradient sidebar with card-based layout",
    descriptionAr: "شريط جانبي مع تصميم بالكروت",
  },
  {
    id: "minimal",
    label: "Minimal",
    labelAr: "مبسط",
    description: "Typographic, black & white, ultra-clean",
    descriptionAr: "نص فقط، أبيض وأسود، نظيف جداً",
  },
];
