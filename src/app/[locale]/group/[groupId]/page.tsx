import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { buildPrivateRouteMetadata } from "@/lib/seo-i18n";
import { supabaseAdmin } from "@/lib/supabase/server";

const GroupResponsesPage = dynamic(() => import("@/views/GroupDetails"));

type RouteParams = { locale: AppLocale; groupId: string };

export async function generateMetadata({
  params,
}: {
  params: RouteParams | Promise<RouteParams>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: "metadata.group" });
  const { groupId } = (params instanceof Promise ? await params : params) ?? {
    groupId: "",
  };
  const path = `/group/${groupId}`;

  const fallback = buildPrivateRouteMetadata(
    locale,
    path,
    t("title"),
    t("description")
  );

  const { data, error } = await supabaseAdmin
    .from("groups")
    .select("name,currency")
    .eq("id", groupId)
    .maybeSingle();

  if (error || !data?.name) {
    return fallback;
  }

  return buildPrivateRouteMetadata(
    locale,
    path,
    t("titleWithName", { name: data.name }),
    t("descriptionWithName", { name: data.name, currency: data.currency })
  );
}

export default async function GroupPage({
  params,
}: {
  params: RouteParams | Promise<RouteParams>;
}) {
  const locale = await resolveLocaleParam(params);
  const resolved = params instanceof Promise ? await params : params;
  const groupId = resolved?.groupId ?? "";
  setRequestLocale(locale);
  return <GroupResponsesPage groupId={groupId} />;
}
