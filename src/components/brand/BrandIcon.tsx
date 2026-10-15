"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

const LOGO_WIDTH = 1349;
const LOGO_HEIGHT = 315;

type BrandIconProps = {
  className?: string;
  /** Intrinsic height passed to Next/Image (display size via className). */
  height?: number;
};

/**
 * Theme-aware SplitCost wordmark logo. Served as the plain file (not through
 * the image optimizer) so it is the copy the service worker precaches, and the
 * logo shows offline from the first visit.
 */
export function BrandIcon({ className, height = 36 }: BrandIconProps) {
  const width = Math.round((height * LOGO_WIDTH) / LOGO_HEIGHT);
  const imageClass = cn("w-auto object-contain object-left", className);

  return (
    <>
      <Image
        src="/logo-light.png"
        alt="SplitCost"
        width={width}
        height={height}
        className={cn(imageClass, "dark:hidden")}
        priority
        unoptimized
      />
      <Image
        src="/logo-dark.png"
        alt="SplitCost"
        width={width}
        height={height}
        className={cn(imageClass, "hidden dark:block")}
        priority
        unoptimized
      />
    </>
  );
}
