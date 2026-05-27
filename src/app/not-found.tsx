import Link from "next/link";

/** Root 404 (invalid locale, etc.) — outside next-intl provider tree. */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center font-sans">
        <h1 className="text-2xl font-bold">404 — Page not found</h1>
        <p className="text-neutral-600">
          Sorry, we could not find that page.
        </p>
        <Link href="/en" className="text-blue-600 underline hover:text-blue-700">
          Go to homepage
        </Link>
      </body>
    </html>
  );
}
