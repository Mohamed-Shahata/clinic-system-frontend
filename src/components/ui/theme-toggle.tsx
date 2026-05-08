"use client";

import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-8 w-8" />;

  const isDark = resolvedTheme === "dark";
  const title = locale === "ar"
    ? isDark
      ? "التبديل إلى الوضع الفاتح"
      : "التبديل إلى الوضع الداكن"
    : isDark
      ? "Switch to light mode"
      : "Switch to dark mode";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded text-sidebar-fg hover:bg-sidebar-hover hover:text-white transition-colors"
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}
