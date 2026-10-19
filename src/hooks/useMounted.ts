import { useSyncExternalStore } from "react";

const subscribeNothing = () => () => {};

/** False while rendering on the server and hydrating, true after that. */
export function useMounted() {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}
