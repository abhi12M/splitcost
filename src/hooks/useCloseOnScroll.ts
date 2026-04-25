"use client";

import * as React from "react";

const overlayScrollSelector = "[data-allow-overlay-scroll='true']";

export function useCloseOnScroll(
  open: boolean,
  onClose: () => void,
  ignoreOverlayScroll = true
) {
  React.useEffect(() => {
    if (!open) return;

    const handleScroll = (event: Event) => {
      if (
        ignoreOverlayScroll &&
        event.target instanceof Element &&
        event.target.closest(overlayScrollSelector)
      ) {
        return;
      }

      onClose();
    };

    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [ignoreOverlayScroll, onClose, open]);
}

