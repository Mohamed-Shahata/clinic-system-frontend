import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "كلينيك — نظام إدارة العيادة", template: "%s | كلينيك" },
  description: "نظام متكامل لإدارة العيادات والمرضى والفواتير",
  icons: { icon: "/icon" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
