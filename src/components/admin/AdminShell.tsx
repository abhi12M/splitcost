"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FileText, LayoutDashboard, Users } from "lucide-react";

import { ADMIN_BASE_PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}[] = [
  { href: ADMIN_BASE_PATH, label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: `${ADMIN_BASE_PATH}/groups`, label: "Groups", icon: Users },
  { href: `${ADMIN_BASE_PATH}/blogs`, label: "Blogs", icon: FileText },
];

type AdminShellProps = {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function AdminShell({
  children,
  title,
  description,
  actions,
}: AdminShellProps) {
  const pathname = usePathname() ?? "";

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="border-b border-border bg-card/80 backdrop-blur">
        <div className="container flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              SplitCost Admin
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>

      <div className="container grid gap-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Admin"
          className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible"
        >
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
