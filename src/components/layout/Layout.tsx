import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";

interface LayoutProps {
  children: ReactNode;
  /** Immersive in-app shell: no site header/footer (e.g. mobile group dashboard). */
  variant?: "default" | "minimal";
}

export function Layout({ children, variant = "default" }: LayoutProps) {
  const showChrome = variant === "default";

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] rounded-md bg-background px-3 py-2 text-sm font-medium shadow-card"
      >
        Skip to content
      </a>
      {showChrome ? <Header /> : null}
      <main
        id="main-content"
        className={
          showChrome
            ? "flex-1 pt-[4.75rem] pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] sm:pt-20 sm:pb-0"
            : "flex-1"
        }
      >
        {children}
      </main>
      {showChrome ? <Footer /> : null}
      {showChrome ? <MobileBottomNav /> : null}
    </div>
  );
}
