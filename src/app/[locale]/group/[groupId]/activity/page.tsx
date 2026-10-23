import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { buildPrivateRouteMetadata } from "@/lib/seo-i18n";

const GroupActivityPage = dynamic(() => import("@/views/GroupActivity"));

type RouteParams = { locale: AppLocale; groupId: string };

async function resolveRouteParams(
  params: RouteParams | Promise<RouteParams> | undefined
): Promise<RouteParams> {
  const locale = await resolveLocaleParam(params);
  const resolved = params instanceof Promise ? await params : params;
  return { locale, groupId: resolved?.groupId ?? "" };
}

export async function generateMetadata({
  params,
}: {
  params: RouteParams | Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, groupId } = await resolveRouteParams(params);
  const t = await getTranslations({ locale, namespace: "metadata.groupActivity" });

  return buildPrivateRouteMetadata(
    locale,
    `/group/${groupId}/activity`,
    t("title"),
    t("description")
  );
}

export default async function GroupActivityRoute({
  params,
}: {
  params: RouteParams | Promise<RouteParams>;
}) {
  const { locale, groupId } = await resolveRouteParams(params);
  setRequestLocale(locale);
  return <GroupActivityPage groupId={groupId} />;
}
