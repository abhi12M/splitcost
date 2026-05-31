"use client";

import { useTranslations } from "next-intl";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <Layout>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <p className="text-7xl font-bold tracking-tight text-primary/20 sm:text-8xl">
          404
        </p>
        <div className="max-w-md space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href="/">{t("goHome")}</Link>
        </Button>
      </div>
    </Layout>
  );
}
