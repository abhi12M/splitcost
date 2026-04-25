import { useEffect, useId, useRef } from "react";

const BACK_CLOSE_KEY = "__backButtonCloseId";

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
