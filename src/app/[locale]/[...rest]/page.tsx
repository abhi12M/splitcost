import { notFound } from "next/navigation";

/** Unknown paths under a locale (e.g. /en/asda) → localized not-found page. */
export default function CatchAllPage() {
  notFound();
}
