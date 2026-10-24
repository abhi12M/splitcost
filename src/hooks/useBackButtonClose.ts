import { useEffect, useId, useRef } from "react";

import { BACK_CLOSE_KEY } from "@/lib/historyKeys";

export function useBackButtonClose(isOpen: boolean, onClose: () => void, locked = false) {
  const reactId = useId();
  const entryIdRef = useRef<string>(reactId);
  const onCloseRef = useRef(onClose);
  const lockedRef = useRef(locked);

  useEffect(() => {
    onCloseRef.current = onClose;
    lockedRef.current = locked;
  }, [onClose, locked]);

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

      // Locked (e.g. a delete is running): Back already popped our entry, so
      // push it again and stay open.
      if (lockedRef.current) {
        const state =
          window.history.state && typeof window.history.state === "object"
            ? window.history.state
            : {};
        window.history.pushState(
          { ...state, [BACK_CLOSE_KEY]: entryIdRef.current },
          "",
          window.location.href
        );
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
