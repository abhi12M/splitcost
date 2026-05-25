import { useEffect, useState } from "react";

export function useKeyboardLayout() {
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined);
  const [viewportOffsetTop, setViewportOffsetTop] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!window.visualViewport) {
          setViewportHeight(window.innerHeight);
          setViewportOffsetTop(0);
          setKeyboardOffset(0);
          setKeyboardOpen(false);
          return;
        }

        const vv = window.visualViewport;
        const keyboardHeight =
          window.innerHeight - vv.height - vv.offsetTop;

        const open = keyboardHeight > 0;

        setKeyboardOffset(open ? keyboardHeight : 0);
        setKeyboardOpen(open);
        setViewportHeight(vv.height);
        setViewportOffsetTop(vv.offsetTop);
      });
    };

    update();

    window.visualViewport?.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  return { keyboardOffset, keyboardOpen, viewportHeight, viewportOffsetTop };
}
