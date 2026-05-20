"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandIconProps = {
  className?: string;
  size?: number;
};

/** Theme-aware brand symbol (transparent PNG, no background). */
export function BrandIcon({ className, size = 36 }: BrandIconProps) {
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand-logo-light.png"
        alt=""
        fill
        sizes={`${size}px`}
        className="object-contain dark:hidden"
        aria-hidden
        priority
      />
      <Image
        src="/brand-logo-dark.png"
        alt=""
        fill
        sizes={`${size}px`}
        className="hidden object-contain dark:block"
        aria-hidden
        priority
      />
    </span>
  );
}
