import Link from "next/link";
import { getTranslations } from "next-intl/server";

type HomeProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomeProps) {
  const { locale } = await params;
  const t = await getTranslations("common");

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-primary">{t("appName")}</h1>
          <p className="mt-4 text-lg text-foreground/80">{t("welcome")}</p>
        </div>
        <Link
          href={`/${locale}/login`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t("signIn")}
        </Link>
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-foreground/10 bg-card p-4">
          Super Admin Dashboard
        </article>
        <article className="rounded-lg border border-foreground/10 bg-card p-4">
          Doctor Admin Dashboard
        </article>
        <article className="rounded-lg border border-foreground/10 bg-card p-4">
          Receptionist Dashboard
        </article>
      </section>
    </main>
  );
}
