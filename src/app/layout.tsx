import type { ReactNode } from "react";

/** Root layout — locale-specific `<html>` lives in `app/[locale]/layout.tsx`. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
