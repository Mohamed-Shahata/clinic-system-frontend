"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export function LangToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function toggle() {
    const next = locale === "ar" ? "en" : "ar";
    // Replace the locale segment in the current URL
    const withoutLocale = pathname.replace(/^\/(ar|en)/, "");
    router.push(`/${next}${withoutLocale || "/"}`);
  }

  return (
    <button
      onClick={toggle}
      title={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      className="flex h-8 items-center gap-1.5 rounded px-2 text-xs font-medium text-sidebar-fg hover:bg-sidebar-hover hover:text-white transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
      {locale === "ar" ? "EN" : "ع"}
    </button>
  );
}
