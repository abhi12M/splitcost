import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { buildPrivateRouteMetadata } from "@/lib/seo-i18n";

const ExpenseDetailsPage = dynamic(() => import("@/views/ExpenseDetails"));

type RouteParams = { locale: AppLocale; groupId: string; expenseId: string };

async function resolveRouteParams(
  params: RouteParams | Promise<RouteParams> | undefined
): Promise<RouteParams> {
  const locale = await resolveLocaleParam(params);
  const resolved = params instanceof Promise ? await params : params;
  return {
    locale,
    groupId: resolved?.groupId ?? "",
    expenseId: resolved?.expenseId ?? "",
  };
}

export async function generateMetadata({
  params,
}: {
  params: RouteParams | Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, groupId, expenseId } = await resolveRouteParams(params);
  const t = await getTranslations({ locale, namespace: "metadata.expenseDetails" });

  return buildPrivateRouteMetadata(
    locale,
    `/group/${groupId}/expense/${expenseId}`,
    t("title"),
    t("description")
  );
}

export default async function ExpenseDetailsRoute({
  params,
}: {
  params: RouteParams | Promise<RouteParams>;
}) {
  const { locale, groupId, expenseId } = await resolveRouteParams(params);
  setRequestLocale(locale);
  return <ExpenseDetailsPage groupId={groupId} expenseId={expenseId} />;
}
