import type { AppLocale } from "./routing";
import { defaultLocale } from "./routing";

type LocaleParams = { locale: AppLocale };

/** Next.js 14 sync params vs Next.js 15+ async params. */
export async function resolveLocaleParam(
  params: LocaleParams | Promise<LocaleParams> | undefined
): Promise<AppLocale> {
  if (!params) {
    return defaultLocale;
  }

  const resolved = params instanceof Promise ? await params : params;
  return resolved?.locale ?? defaultLocale;
}
