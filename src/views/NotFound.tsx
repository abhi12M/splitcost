"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      <Link href="/" className="text-primary underline hover:text-primary/90">
        {t("goHome")}
      </Link>
    </main>
  );
}
