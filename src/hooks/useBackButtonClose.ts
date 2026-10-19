import { useEffect, useId, useRef } from "react";

import { BACK_CLOSE_KEY } from "@/lib/historyKeys";

export function useBackButtonClose(isOpen: boolean, onClose: () => void) {
  const reactId = useId();
  const entryIdRef = useRef<string>(reactId);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    let closedByBackButton = false;
    const currentState =
      window.history.state && typeof window.history.state === "object"
        ? window.history.state
        : {};

    window.history.pushState(
      { ...currentState, [BACK_CLOSE_KEY]: entryIdRef.current },
      "",
      window.location.href
    );

    const handlePopState = () => {
      const activeEntryId = window.history.state?.[BACK_CLOSE_KEY];

      // When multiple overlays are stacked, a back navigation from the top
      // layer should not also close the layer underneath if its history entry
      // just became active again.
      if (activeEntryId === entryIdRef.current) {
        return;
      }

      closedByBackButton = true;
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);

      if (
        !closedByBackButton &&
        window.history.state?.[BACK_CLOSE_KEY] === entryIdRef.current
      ) {
        window.history.back();
      }
    };
  }, [isOpen]);
}
