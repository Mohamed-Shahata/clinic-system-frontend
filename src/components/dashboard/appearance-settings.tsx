"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LangToggle } from "@/components/ui/lang-toggle";
import { useState, useEffect } from "react";
import {
  PRESCRIPTION_STYLES,
  type PrescriptionStyle,
} from "@/lib/prescription-templates";

export function AppearanceSettings({ locale }: { locale: string }) {
  const isAr = locale === "ar";
  const [prescStyle, setPrescStyle] = useState<PrescriptionStyle>("classic");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/prescriptions/template")
      .then((r) => r.json())
      .then((d) => {
        const style = (d?.header as { style?: string } | undefined)?.style;
        if (style) setPrescStyle(style as PrescriptionStyle);
      })
      .catch(() => {});
  }, []);

  async function saveStyle(style: PrescriptionStyle) {
    setPrescStyle(style);
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/prescriptions/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ header: { style } }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Theme & Language */}
      <div className="rounded-lg border border-card-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-1">
          {isAr ? "المظهر واللغة" : "Appearance & Language"}
        </h2>
        <p className="text-xs text-muted mb-4">
          {isAr
            ? "تغيير وضع العرض أو لغة الواجهة"
            : "Change display mode or interface language"}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">
              {isAr ? "الوضع" : "Theme"}
            </span>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">
              {isAr ? "اللغة" : "Language"}
            </span>
            <LangToggle />
          </div>
        </div>
      </div>

      {/* Prescription Template */}
      <div className="rounded-lg border border-card-border bg-card p-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-foreground">
            {isAr ? "قالب الروشته" : "Prescription Template"}
          </h2>
          {saving && (
            <svg
              className="animate-spin text-muted"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
          {saved && (
            <span className="text-xs text-success font-medium">
              {isAr ? "✓ تم الحفظ" : "✓ Saved"}
            </span>
          )}
        </div>
        <p className="text-xs text-muted mb-4">
          {isAr
            ? "اختر شكل الروشته عند الطباعة"
            : "Choose how your prescriptions look when printed"}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESCRIPTION_STYLES.map(
            (s: (typeof PRESCRIPTION_STYLES)[number]) => (
              <button
                key={s.id}
                type="button"
                onClick={() => void saveStyle(s.id)}
                className={`relative rounded-xl border-2 p-4 text-start transition-all ${
                  prescStyle === s.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-surface hover:border-primary/40 hover:bg-surface-2"
                }`}
              >
                {/* Preview thumbnail */}
                <div
                  className={`mb-3 h-16 rounded-lg overflow-hidden flex flex-col gap-1.5 p-2 ${
                    s.id === "classic"
                      ? "bg-blue-50"
                      : s.id === "modern"
                        ? "bg-gradient-to-br from-sky-50 to-indigo-50"
                        : "bg-gray-50"
                  }`}
                >
                  {/* Header line */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-5 h-5 rounded flex-shrink-0 ${
                        s.id === "classic"
                          ? "bg-blue-800"
                          : s.id === "modern"
                            ? "bg-sky-500"
                            : "bg-gray-800"
                      }`}
                    />
                    <div
                      className={`h-2 flex-1 rounded ${
                        s.id === "classic"
                          ? "bg-blue-200"
                          : s.id === "modern"
                            ? "bg-gradient-to-r from-sky-300 to-indigo-300"
                            : "bg-gray-300"
                      }`}
                    />
                  </div>
                  {/* Content lines */}
                  {[100, 75, 85].map((w, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded ${
                        s.id === "modern" ? "bg-sky-200" : "bg-gray-200"
                      }`}
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {isAr ? s.labelAr : s.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {isAr ? s.descriptionAr : s.description}
                    </p>
                  </div>
                  {prescStyle === s.id && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
