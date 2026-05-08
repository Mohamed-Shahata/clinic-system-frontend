"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocale } from "next-intl";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
} from "@/components/ui";

export function ClinicSettingsForm({
  name,
  timezone,
  defaultLocale,
  currentLogoUrl,
}: {
  name: string;
  timezone: string;
  defaultLocale: string;
  currentLogoUrl?: string | null;
}) {
  const router = useRouter();
  const uiLocale = useLocale();
  const isAr = uiLocale === "ar";

  const [clinicName, setClinicName] = useState(name);
  const [clinicTimezone, setClinicTimezone] = useState(timezone);
  const [locale, setLocale] = useState(defaultLocale);
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl ?? "");
  const [logoPreview, setLogoPreview] = useState<string | null>(
    currentLogoUrl ?? null,
  );
  const [uploadPending, setUploadPending] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoPreview(URL.createObjectURL(file));
    setUploadPending(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload?folder=logos", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !data.url) {
        setIsSuccess(false);
        setMessage(
          data.message ?? (isAr ? "فشل رفع الشعار" : "Logo upload failed"),
        );
        return;
      }
      setLogoUrl(data.url);
      setIsSuccess(true);
      setMessage(
        isAr
          ? "تم رفع الشعار — اضغط حفظ لتطبيق التغيير"
          : "Logo uploaded — click Save to apply",
      );
    } finally {
      setUploadPending(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    setIsSuccess(null);
    try {
      const res = await fetch("/api/clinics/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clinicName,
          timezone: clinicTimezone,
          defaultLocale: locale,
          logoUrl: logoUrl.trim() || undefined,
        }),
      });
      setIsSuccess(res.ok);
      setMessage(
        res.ok
          ? isAr
            ? "تم حفظ الإعدادات"
            : "Settings saved"
          : isAr
            ? "تعذر حفظ الإعدادات"
            : "Could not save settings",
      );
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-foreground">
          {isAr ? "إعدادات العيادة" : "Clinic Settings"}
        </h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Input
            label={isAr ? "اسم العيادة" : "Clinic Name"}
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
          />

          {/* Logo upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {isAr ? "شعار العيادة" : "Clinic Logo"}
            </label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg border border-border bg-surface flex items-center justify-center overflow-hidden shrink-0">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="logo"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadPending}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2 disabled:opacity-50 transition-colors"
                >
                  {uploadPending ? (
                    <svg
                      className="animate-spin"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="40"
                        strokeDashoffset="20"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  )}
                  {uploadPending
                    ? isAr
                      ? "جاري الرفع..."
                      : "Uploading..."
                    : isAr
                      ? "رفع شعار"
                      : "Upload logo"}
                </button>
                <p className="text-xs text-muted">
                  PNG أو SVG أو WEBP — أقل من 5MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleLogoChange(e)}
                />
              </div>
            </div>
          </div>

          <Input
            label={isAr ? "المنطقة الزمنية" : "Timezone"}
            value={clinicTimezone}
            onChange={(e) => setClinicTimezone(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              {isAr ? "اللغة" : "Language"}
            </label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value="ar">{isAr ? "العربية" : "Arabic"}</option>
              <option value="en">English</option>
            </select>
          </div>

          {message && (
            <Alert variant={isSuccess ? "success" : "error"}>{message}</Alert>
          )}
          <Button type="submit" loading={pending}>
            {isAr ? "حفظ الإعدادات" : "Save Settings"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
