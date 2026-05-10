import Link from "next/link";

export default async function NotFound({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";

  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground">
      <div className="mx-auto max-w-lg rounded-lg border border-card-border bg-card p-6 text-center shadow-card">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-xl font-bold">
          {isAr ? "الصفحة غير موجودة" : "Page Not Found"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {isAr
            ? "الرابط غير صحيح أو تم نقل الصفحة."
            : "The link is invalid or the page has moved."}
        </p>
        <Link
          href={`/${locale}/dashboard`}
          className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          {isAr ? "الرجوع للوحة التحكم" : "Back to dashboard"}
        </Link>
      </div>
    </main>
  );
}
