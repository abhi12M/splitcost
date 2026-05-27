"use client";

import { Menu, MessageCircle, Plus, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

import { MobileMenuSheet } from "@/components/layout/MobileMenuSheet";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useMyGroupsCount } from "@/hooks/useMyGroupsCount";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type TabId = "menu" | "groups" | "new" | "contact";

function GroupsBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className="absolute -right-1 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground tabular-nums"
      aria-hidden
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function MenuToggleIcon({ open }: { open: boolean }) {
  return (
    <span className="relative inline-flex h-6 w-6 items-center justify-center" aria-hidden>
      <Menu
        className={cn(
          "absolute h-6 w-6 transition-all duration-300 ease-out motion-reduce:transition-none",
          open ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        )}
        strokeWidth={2.25}
      />
      <X
        className={cn(
          "absolute h-6 w-6 transition-all duration-300 ease-out motion-reduce:transition-none",
          open ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0"
        )}
        strokeWidth={2.25}
      />
    </span>
  );
}

type NavButtonProps = {
  active: boolean;
  label: string;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
  ariaExpanded?: boolean;
  ariaLabel?: string;
};

function NavButton({
  active,
  label,
  onClick,
  href,
  children,
  ariaExpanded,
  ariaLabel,
}: NavButtonProps) {
  const className = cn(
    "relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
    active ? "text-primary" : "text-muted-foreground"
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-current={active ? "page" : undefined}>
        {children}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-expanded={ariaExpanded}
      aria-label={ariaLabel ?? label}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function resolveActiveTab(pathname: string, menuOpen: boolean): TabId | null {
  if (menuOpen) {
    return "menu";
  }
  if (pathname.startsWith("/contact")) {
    return "contact";
  }
  if (pathname === "/create-group") {
    return "new";
  }
  if (pathname.startsWith("/groups") || pathname.startsWith("/group/")) {
    return "groups";
  }
  return null;
}

export function MobileBottomNav() {
  const t = useTranslations("layout");
  const deviceType = useDeviceType();
  const pathname = usePathname();
  const groupsCount = useMyGroupsCount();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useBackButtonClose(menuOpen, () => setMenuOpen(false));

  if (deviceType !== "mobile") {
    return null;
  }

  const activeTab = resolveActiveTab(pathname, menuOpen);

  return (
    <>
      <nav
        aria-label={t("mobileNav")}
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background sm:hidden"
      >
        <div className="grid grid-cols-4 divide-x divide-border pb-[env(safe-area-inset-bottom,0px)]">
          <NavButton
            active={activeTab === "menu"}
            label={menuOpen ? t("close") : t("menu")}
            onClick={() => setMenuOpen((open) => !open)}
            ariaExpanded={menuOpen}
            ariaLabel={menuOpen ? t("closeMenu") : t("openMenu")}
          >
            <MenuToggleIcon open={menuOpen} />
          </NavButton>

          <NavButton active={activeTab === "groups"} label={t("groups")} href="/groups">
            <span className="relative inline-flex">
              <Users
                className={cn(
                  "h-6 w-6",
                  activeTab === "groups" ? "text-primary" : "text-foreground"
                )}
                strokeWidth={1.75}
                aria-hidden
              />
              <GroupsBadge count={groupsCount} />
            </span>
          </NavButton>

          <NavButton active={activeTab === "new"} label={t("new")} href="/create-group">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary"
              aria-hidden
            >
              <Plus className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </span>
          </NavButton>

          <NavButton active={activeTab === "contact"} label={t("contact")} href="/contact">
            <MessageCircle
              className={cn(
                "h-6 w-6",
                activeTab === "contact" ? "text-primary" : "text-foreground"
              )}
              strokeWidth={1.75}
              aria-hidden
            />
          </NavButton>
        </div>
      </nav>

      <MobileMenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
