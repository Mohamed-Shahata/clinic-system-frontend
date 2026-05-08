"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LangToggle } from "@/components/ui/lang-toggle";

export function AppearanceSettings({ locale }: { locale: string }) {
  const isAr = locale === "ar";
  return (
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
          <span className="text-xs text-muted">{isAr ? "الوضع" : "Theme"}</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{isAr ? "اللغة" : "Language"}</span>
          <LangToggle />
        </div>
      </div>
    </div>
  );
}
