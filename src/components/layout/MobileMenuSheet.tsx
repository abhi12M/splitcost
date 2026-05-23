"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Briefcase,
  ChevronRight,
  CircleHelp,
  FileText,
  Mail,
  MessageCircleQuestion,
  Shield,
  Star,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** Matches `MobileBottomNav` height (bar + safe area). */
export const MOBILE_BOTTOM_NAV_OFFSET =
  "calc(4.25rem + env(safe-area-inset-bottom, 0px))";

type MobileMenuSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MenuLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const MENU_SECTIONS: { title: string; links: MenuLink[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/#how-it-works", label: "How it works", icon: CircleHelp },
      { href: "/#features", label: "Features", icon: Star },
      { href: "/#use-cases", label: "Use cases", icon: Briefcase },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/#faq", label: "FAQ", icon: MessageCircleQuestion },
      { href: "/contact", label: "Contact", icon: Mail },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy", icon: Shield },
      { href: "/terms", label: "Terms", icon: FileText },
    ],
  },
];

function MenuRow({
  href,
  label,
  icon: Icon,
  onNavigate,
}: MenuLink & { onNavigate: () => void }) {
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
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" strokeWidth={2} aria-hidden />
    </Link>
  );
}

function LightModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isLight =
    mounted && (theme === "light" || (theme === "system" && resolvedTheme === "light"));

  return (
    <div className="mx-4 flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <Sun className="h-[22px] w-[22px] shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
      <span className="flex-1 text-[15px] font-medium text-foreground">Light mode</span>
      <Switch
        checked={isLight}
        onCheckedChange={(checked) => setTheme(checked ? "light" : "dark")}
        aria-label="Toggle light mode"
      />
    </div>
  );
}

export function MobileMenuSheet({ open, onOpenChange }: MobileMenuSheetProps) {
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
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Site navigation, settings, and quick links
        </SheetDescription>

        <div className="overflow-y-auto overscroll-contain pt-3 pb-4">
          {MENU_SECTIONS.map((section, sectionIndex) => (
            <div key={section.title}>
              {sectionIndex > 0 ? (
                <div className="mx-4 border-t border-border" role="presentation" />
              ) : null}
              <p className="px-4 pb-0.5 pt-3 text-[13px] font-medium text-muted-foreground">
                {section.title}
              </p>
              <nav aria-label={section.title}>
                {section.links.map((link) => (
                  <MenuRow key={`${section.title}-${link.href}`} {...link} onNavigate={close} />
                ))}
              </nav>
            </div>
          ))}

          <div className="pt-2">
            <div className="mx-4 border-t border-border" role="presentation" />
            <div className="pt-3">
              <LightModeToggle />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
