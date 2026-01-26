import { useEffect, useState } from "react";

export function useKeyboardLayout() {
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      if (!window.visualViewport) return;

      const vv = window.visualViewport;
      const keyboardHeight =
        window.innerHeight - vv.height - vv.offsetTop;

      const open = keyboardHeight > 0;

      setKeyboardOffset(open ? keyboardHeight : 0);
      setKeyboardOpen(open);
    };

    update();

    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  return { keyboardOffset, keyboardOpen };
}
