"use client";

import {
  Briefcase,
  BookOpen,
  ChevronRight,
  CircleHelp,
  FileText,
  Mail,
  MessageCircleQuestion,
  Scale,
  Shield,
  Star,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";

import { LanguageList } from "@/components/i18n/LanguageList";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Matches `MobileBottomNav` height (bar + safe area). */
export const MOBILE_BOTTOM_NAV_OFFSET =
  "calc(4.25rem + env(safe-area-inset-bottom, 0px))";

type MobileMenuSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MenuLink = {
  href: "/" | "/#how-it-works" | "/#features" | "/use-cases" | "/compare" | "/resources" | "/blog" | "/#faq" | "/contact" | "/privacy" | "/terms";
  labelKey: "howItWorks" | "features" | "useCases" | "compare" | "resources" | "blog" | "faq" | "contact" | "privacy" | "terms";
  icon: LucideIcon;
};

const MENU_SECTIONS: { titleKey: "product" | "support" | "legal"; links: MenuLink[] }[] = [
  {
    titleKey: "product",
    links: [
      { href: "/#how-it-works", labelKey: "howItWorks", icon: CircleHelp },
      { href: "/#features", labelKey: "features", icon: Star },
      { href: "/use-cases", labelKey: "useCases", icon: Briefcase },
      { href: "/compare", labelKey: "compare", icon: Scale },
    ],
  },
  {
    titleKey: "support",
    links: [
      { href: "/#faq", labelKey: "faq", icon: MessageCircleQuestion },
      { href: "/contact", labelKey: "contact", icon: Mail },
      { href: "/resources", labelKey: "resources", icon: BookOpen },
      { href: "/blog", labelKey: "blog", icon: FileText },
    ],
  },
  {
    titleKey: "legal",
    links: [
      { href: "/privacy", labelKey: "privacy", icon: Shield },
      { href: "/terms", labelKey: "terms", icon: FileText },
    ],
  },
];

function MenuRow({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: MenuLink["href"];
  label: string;
  icon: LucideIcon;
  onNavigate: () => void;
}) {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onNavigate();

    window.setTimeout(() => {
      router.push(href);
    }, 0);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
    >
      <Icon className="h-[22px] w-[22px] shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
      <span className="flex-1">{label}</span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground/60"
        strokeWidth={2}
        aria-hidden
      />
    </Link>
  );
}

function LightModeToggle() {
  const t = useTranslations("layout");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isLight =
    mounted && (theme === "light" || (theme === "system" && resolvedTheme === "light"));

  return (
    <div className="mx-4 flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <Sun className="h-[22px] w-[22px] shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
      <span className="flex-1 text-[15px] font-medium text-foreground">{t("lightMode")}</span>
      <Switch
        checked={isLight}
        onCheckedChange={(checked) => setTheme(checked ? "light" : "dark")}
        aria-label={t("toggleLightMode")}
      />
    </div>
  );
}

export function MobileMenuSheet({ open, onOpenChange }: MobileMenuSheetProps) {
  const t = useTranslations("layout");
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "flex flex-col gap-0 overflow-hidden rounded-t-[20px] border-x-0 border-b-0 p-0",
          "bottom-[var(--mobile-nav-offset)] max-h-[calc(100dvh-var(--mobile-nav-offset))]",
          "[&>button]:hidden"
        )}
        style={{ "--mobile-nav-offset": MOBILE_BOTTOM_NAV_OFFSET } as CSSProperties}
      >
        <SheetTitle className="sr-only">{t("menuSheetTitle")}</SheetTitle>
        <SheetDescription className="sr-only">{t("menuSheetDescription")}</SheetDescription>

        <div className="overflow-y-auto overscroll-contain pt-3 pb-4">
          {MENU_SECTIONS.map((section, sectionIndex) => (
            <div key={section.titleKey}>
              {sectionIndex > 0 ? (
                <div className="mx-4 border-t border-border" role="presentation" />
              ) : null}
              <p className="px-4 pb-0.5 pt-3 text-[13px] font-medium text-muted-foreground">
                {t(section.titleKey)}
              </p>
              <nav aria-label={t(section.titleKey)}>
                {section.links.map((link) => (
                  <MenuRow
                    key={`${section.titleKey}-${link.href}`}
                    href={link.href}
                    label={t(link.labelKey)}
                    icon={link.icon}
                    onNavigate={close}
                  />
                ))}
              </nav>
            </div>
          ))}

          <div className="pt-2">
            <div className="mx-4 border-t border-border" role="presentation" />
            <LanguageList variant="menu" onSelect={close} />
            <div className="pt-1">
              <LightModeToggle />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
