import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { routing } from "@/lib/i18n/routing";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { PageLoader } from "@/components/ui/page-loader";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "ar" | "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <ThemeProvider>
        <NextIntlClientProvider messages={messages}>
          <PageLoader />
          {children}
        </NextIntlClientProvider>
      </ThemeProvider>
    </div>
  );
}
