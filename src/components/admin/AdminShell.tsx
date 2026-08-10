"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ADMIN_BASE_PATH } from "@/lib/constants";

const navItems = [
  { href: ADMIN_BASE_PATH, label: "Dashboard" },
  { href: `${ADMIN_BASE_PATH}/groups`, label: "Groups" },
  { href: `${ADMIN_BASE_PATH}/blogs`, label: "Blogs" },
  { href: `${ADMIN_BASE_PATH}/categories`, label: "Categories" },
  { href: `${ADMIN_BASE_PATH}/media`, label: "Media" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isNavActive = (href: string) => {
    if (href === ADMIN_BASE_PATH) return pathname === href;
    if (href === `${ADMIN_BASE_PATH}/groups`) {
      return pathname.startsWith(href) || pathname.startsWith(`${ADMIN_BASE_PATH}/group/`);
    }
    return pathname.startsWith(href);
  };

  return (
    <Layout>
      <section className="py-8 md:py-10">
        <div className="container space-y-6">
          <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">SplitCost Admin</p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Content and groups
              </h1>
            </div>
            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant={isNavActive(item.href) ? "default" : "outline"}
                  size="sm"
                >
                  <Link
                    href={item.href}
                    aria-current={isNavActive(item.href) ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </Button>
              ))}
            </nav>
          </div>
          {children}
        </div>
      </section>
    </Layout>
  );
}
