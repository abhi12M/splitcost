"use client";

import { useEffect } from "react";

import { isOnline, subscribeOnline } from "@/lib/offline/network";

// A transparent 1×1 image: once swapped in, the element shows only its muted
// background instead of the browser's broken-image icon and alt text.
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

/**
 * Turns images that fail to load (offline, and never seen before) into a
 * neutral placeholder, and loads them again once the connection is back. One
 * listener for the whole app: image error events don't bubble, so it listens
 * in the capture phase.
 */
export function ImageFallback() {
  useEffect(() => {
    const fallBack = (image: HTMLImageElement) => {
      if (image.dataset.fallback) return;
      image.dataset.fallback = "true";
      image.dataset.fallbackSrc = image.getAttribute("src") ?? "";
      image.dataset.fallbackSrcset = image.getAttribute("srcset") ?? "";
      image.removeAttribute("srcset");
      image.classList.add("bg-muted");
      image.src = BLANK;
    };
    const restore = () => {
      document.querySelectorAll<HTMLImageElement>("img[data-fallback]").forEach((image) => {
        const { fallbackSrc, fallbackSrcset } = image.dataset;
        delete image.dataset.fallback;
        delete image.dataset.fallbackSrc;
        delete image.dataset.fallbackSrcset;
        image.classList.remove("bg-muted");
        if (fallbackSrcset) image.setAttribute("srcset", fallbackSrcset);
        if (fallbackSrc) image.src = fallbackSrc;
      });
    };
    const onError = (event: Event) => {
      if (event.target instanceof HTMLImageElement) fallBack(event.target);
    };

    document.addEventListener("error", onError, true);
    // Images in the server-rendered page may have failed before this ran.
    document.querySelectorAll("img").forEach((image) => {
      if (image.complete && image.naturalWidth === 0 && image.currentSrc) fallBack(image);
    });
    // Back online: try the real images again. One that still fails simply
    // becomes a placeholder again.
    let wasOnline = isOnline();
    const unsubscribe = subscribeOnline(() => {
      const online = isOnline();
      if (online && !wasOnline) restore();
      wasOnline = online;
    });
    return () => {
      document.removeEventListener("error", onError, true);
      unsubscribe();
    };
  }, []);

  return null;
}
