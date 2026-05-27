import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";

import { routing } from "./routing";

type Messages = Record<string, unknown>;

async function loadMessages(locale: string): Promise<Messages> {
  return (await import(`../../messages/${locale}.json`)).default as Messages;
}

function deepMerge<T extends Messages>(base: T, override: Messages): T {
  const result = { ...base } as T;

  for (const key of Object.keys(override)) {
    const baseValue = base[key];
    const overrideValue = override[key];

    if (
      baseValue &&
      overrideValue &&
      typeof baseValue === "object" &&
      typeof overrideValue === "object" &&
      !Array.isArray(baseValue) &&
      !Array.isArray(overrideValue)
    ) {
      result[key as keyof T] = deepMerge(
        baseValue as Messages,
        overrideValue as Messages
      ) as T[keyof T];
    } else {
      result[key as keyof T] = overrideValue as T[keyof T];
    }
  }

  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const english = await loadMessages("en");
  const localized =
    locale === "en" ? english : deepMerge(english, await loadMessages(locale));

  return {
    locale,
    messages: localized,
  };
});
