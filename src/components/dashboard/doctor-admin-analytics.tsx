"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Card, CardBody, CardHeader } from "@/components/ui";

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, isAr: boolean) {
  return n.toLocaleString(isAr ? "ar-EG" : "en-US");
}

function monthName(m: number, isAr: boolean) {
  return new Date(2024, m - 1, 1).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
    month: "short",
  });
}

function arrow(change: number) {
  if (change > 0) return { icon: "↑", cls: "text-success" };
  if (change < 0) return { icon: "↓", cls: "text-danger" };
  return { icon: "→", cls: "text-muted" };
}

// ── SVG Bar Chart ────────────────────────────────────────────────────────────
function BarChart({
  data,
  isAr,
  color = "var(--color-primary, #1565C0)",
  height = 120,
}: {
  data: Array<{ label: string; value: number }>;
  isAr: boolean;
  color?: string;
  height?: number;
}) {
  const W = 560;
  const H = height;
  const PADDING = { top: 8, bottom: 28, left: 8, right: 8 };
  const chartH = H - PADDING.top - PADDING.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.floor(
    (W - PADDING.left - PADDING.right) / Math.max(data.length, 1),
  );
  const gap = Math.max(2, Math.floor(barW * 0.18));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {data.map((d, i) => {
        const bH = Math.max(2, (d.value / max) * chartH);
        const x = PADDING.left + i * barW;
        const y = PADDING.top + chartH - bH;
        return (
          <g key={d.label}>
            <rect
              x={x + gap / 2}
              y={y}
              width={barW - gap}
              height={bH}
              rx={3}
              fill={color}
              opacity={0.85}
            />
            <text
              x={x + barW / 2}
              y={H - 4}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              className="text-muted"
              style={{ fill: "var(--color-muted, #64748b)" }}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG Line Chart ───────────────────────────────────────────────────────────
function LineChart({
  data,
  color = "var(--color-primary, #1565C0)",
  height = 100,
}: {
  data: Array<{ label: string; value: number }>;
  color?: string;
  height?: number;
}) {
  const W = 560;
  const H = height;
  const PAD = { top: 8, bottom: 24, left: 8, right: 8 };
  const chartH = H - PAD.top - PAD.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX =
    data.length > 1 ? (W - PAD.left - PAD.right) / (data.length - 1) : W;

  const pts = data.map((d, i) => ({
    x: PAD.left + i * stepX,
    y: PAD.top + chartH - (d.value / max) * chartH,
    label: d.label,
    value: d.value,
  }));

  const pathD = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  const areaD =
    pathD +
    ` L${pts[pts.length - 1].x},${PAD.top + chartH} L${pts[0].x},${PAD.top + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area */}
      <path d={areaD} fill="url(#lineGrad)" />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dots + labels */}
      {pts.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r={3} fill={color} />
          <text
            x={p.x}
            y={H - 4}
            textAnchor="middle"
            fontSize={9}
            style={{ fill: "var(--color-muted, #64748b)" }}
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({
  segments,
  size = 88,
}: {
  segments: Array<{ value: number; color: string; label: string }>;
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = 32;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 12;
  let cumAngle = -Math.PI / 2;

  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return {
      ...seg,
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      angle,
    };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        opacity={0.08}
      />
      {arcs.map((arc) =>
        arc.value > 0 ? (
          <path
            key={arc.label}
            d={arc.d}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        ) : null,
      )}
    </svg>
  );
}

// ── Stat tile with trend arrow ────────────────────────────────────────────────
function TrendTile({
  label,
  value,
  prev,
  unit = "",
  isAr,
  color = "text-primary",
}: {
  label: string;
  value: number;
  prev?: number;
  unit?: string;
  isAr: boolean;
  color?: string;
}) {
  const change = prev !== undefined ? value - prev : 0;
  const pct = prev ? Math.round((change / prev) * 100) : 0;
  const { icon, cls } = arrow(change);

  return (
    <div className="rounded-xl border border-card-border bg-card px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${color}`}>
        {fmt(value, isAr)}
        {unit && (
          <span className="text-sm font-medium text-muted ms-1">{unit}</span>
        )}
      </p>
      {prev !== undefined && (
        <p className={`mt-0.5 text-xs font-medium ${cls}`}>
          {icon} {Math.abs(pct)}%{" "}
          <span className="text-muted font-normal">
            {isAr ? "عن الشهر الماضي" : "vs last month"}
          </span>
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function DoctorAdminAnalytics({
  patients,
  monthlyRevenue,
}: {
  patients: Array<{ createdAt: string }>;
  monthlyRevenue: Array<{ month: string; amount: number }>;
}) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(currentYear);

  // ── Build monthly patients data for selected year ──────────────────────────
  const monthlyPatients = useMemo(() => {
    const counts: Record<number, number> = {};
    patients.forEach((p) => {
      const d = new Date(p.createdAt);
      if (d.getFullYear() === year) {
        const m = d.getMonth() + 1;
        counts[m] = (counts[m] ?? 0) + 1;
      }
    });
    return Array.from({ length: 12 }, (_, i) => ({
      label: monthName(i + 1, isAr),
      value: counts[i + 1] ?? 0,
    }));
  }, [patients, year, isAr]);

  // ── Monthly revenue for selected year ─────────────────────────────────────
  const revenueByMonth = useMemo(() => {
    const map: Record<number, number> = {};
    monthlyRevenue.forEach((item) => {
      if (Number(item.month.slice(0, 4)) === year) {
        map[Number(item.month.slice(-2))] = item.amount;
      }
    });
    return Array.from({ length: 12 }, (_, i) => ({
      label: monthName(i + 1, isAr),
      value: map[i + 1] ?? 0,
    }));
  }, [monthlyRevenue, year, isAr]);

  // ── Summary numbers ───────────────────────────────────────────────────────
  const totalYearPatients = monthlyPatients.reduce((s, d) => s + d.value, 0);
  const totalYearRevenue = revenueByMonth.reduce((s, d) => s + d.value, 0);
  const thisMonthPatients =
    year === currentYear ? (monthlyPatients[currentMonth - 1]?.value ?? 0) : 0;
  const lastMonthPatients =
    year === currentYear && currentMonth > 1
      ? (monthlyPatients[currentMonth - 2]?.value ?? 0)
      : undefined;
  const thisMonthRevenue =
    year === currentYear ? (revenueByMonth[currentMonth - 1]?.value ?? 0) : 0;
  const lastMonthRevenue =
    year === currentYear && currentMonth > 1
      ? (revenueByMonth[currentMonth - 2]?.value ?? 0)
      : undefined;

  // Max month stats
  const maxPatientMonth = [...monthlyPatients].sort(
    (a, b) => b.value - a.value,
  )[0];
  const maxRevenueMonth = [...revenueByMonth].sort(
    (a, b) => b.value - a.value,
  )[0];

  // Donut: patients distribution Q1-Q4
  const quarters = [0, 1, 2, 3].map((q) => ({
    label: `Q${q + 1}`,
    value: monthlyPatients
      .slice(q * 3, q * 3 + 3)
      .reduce((s, d) => s + d.value, 0),
    color: ["#1565C0", "#2E7D32", "#E65100", "#6A1B9A"][q],
  }));

  const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-5">
      {/* Year filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm font-semibold text-foreground">
          {isAr ? "تحليلات العيادة" : "Clinic Analytics"}
        </p>
        <div className="flex gap-1 ms-auto">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                year === y
                  ? "bg-primary text-primary-fg"
                  : "bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              {y.toLocaleString(isAr ? "ar-EG" : "en-GB", { useGrouping: false })}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TrendTile
          label={isAr ? "مرضى هذا الشهر" : "Patients this month"}
          value={thisMonthPatients}
          prev={lastMonthPatients}
          isAr={isAr}
          color="text-primary"
        />
        <TrendTile
          label={isAr ? "إجمالي مرضى السنة" : "Total patients"}
          value={totalYearPatients}
          isAr={isAr}
          color="text-success"
        />
        <TrendTile
          label={isAr ? "إيرادات هذا الشهر" : "Revenue this month"}
          value={thisMonthRevenue}
          prev={lastMonthRevenue}
          unit="EGP"
          isAr={isAr}
          color="text-primary"
        />
        <TrendTile
          label={isAr ? "إجمالي إيرادات السنة" : "Total revenue"}
          value={totalYearRevenue}
          unit="EGP"
          isAr={isAr}
          color="text-success"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Patients bar chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {isAr ? "المرضى الجدد شهرياً" : "New Patients per Month"}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {isAr
                    ? `أكثر شهر: ${maxPatientMonth.label} (${maxPatientMonth.value})`
                    : `Peak: ${maxPatientMonth.label} (${maxPatientMonth.value})`}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <BarChart
              data={monthlyPatients}
              isAr={isAr}
              color="hsl(var(--primary))"
              height={130}
            />
          </CardBody>
        </Card>

        {/* Revenue line chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {isAr ? "الإيرادات الشهرية" : "Monthly Revenue"}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {isAr
                    ? `أعلى شهر: ${maxRevenueMonth.label} (${fmt(maxRevenueMonth.value, isAr)} EGP)`
                    : `Peak: ${maxRevenueMonth.label} (${fmt(maxRevenueMonth.value, isAr)} EGP)`}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <LineChart
              data={revenueByMonth}
              color="hsl(var(--success))"
              height={130}
            />
          </CardBody>
        </Card>
      </div>

      {/* Bottom row: Donut + Monthly breakdown table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quarterly donut */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "توزيع المرضى فصلياً" : "Patients by Quarter"}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-4 flex-wrap">
              <DonutChart segments={quarters} size={96} />
              <ul className="space-y-2 flex-1">
                {quarters.map((q) => (
                  <li key={q.label} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: q.color }}
                    />
                    <span className="text-muted">{q.label}</span>
                    <span className="font-semibold text-foreground ms-auto">
                      {q.value} {isAr ? "مريض" : "pts"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>

        {/* Monthly summary table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">
              {isAr ? "ملخص شهري مفصل" : "Monthly Breakdown"}
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-card-border bg-surface-2/50">
                    <th
                      className={`px-4 py-2.5 font-semibold text-muted ${isAr ? "text-right" : "text-left"}`}
                    >
                      {isAr ? "الشهر" : "Month"}
                    </th>
                    <th
                      className={`px-4 py-2.5 font-semibold text-muted ${isAr ? "text-right" : "text-left"}`}
                    >
                      {isAr ? "المرضى" : "Patients"}
                    </th>
                    <th
                      className={`px-4 py-2.5 font-semibold text-muted ${isAr ? "text-right" : "text-left"}`}
                    >
                      {isAr ? "الإيرادات" : "Revenue"}
                    </th>
                    <th
                      className={`px-4 py-2.5 font-semibold text-muted ${isAr ? "text-right" : "text-left"}`}
                    >
                      {isAr ? "الاتجاه" : "Trend"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = i + 1;
                    const pts = monthlyPatients[i].value;
                    const rev = revenueByMonth[i].value;
                    const prevPts =
                      i > 0 ? monthlyPatients[i - 1].value : undefined;
                    const isCurrentMonth =
                      year === currentYear && m === currentMonth;
                    const { icon: trendIcon, cls } = arrow(
                      prevPts !== undefined ? pts - prevPts : 0,
                    );
                    return (
                      <tr
                        key={m}
                        className={`border-b border-card-border last:border-0 ${
                          isCurrentMonth
                            ? "bg-primary/4"
                            : "hover:bg-surface-2/50"
                        } transition-colors`}
                      >
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          {monthName(m, isAr)}
                          {isCurrentMonth && (
                            <span className="ms-1.5 text-[10px] text-primary font-semibold">
                              {isAr ? "●" : "●"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">
                          {pts || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">
                          {rev ? `${fmt(rev, isAr)} EGP` : "—"}
                        </td>
                        <td className={`px-4 py-2.5 font-semibold ${cls}`}>
                          {prevPts !== undefined && pts !== prevPts
                            ? trendIcon
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
