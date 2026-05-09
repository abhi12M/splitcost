import { useSyncExternalStore } from "react";

type DeviceType = "mobile" | "tablet" | "desktop";

const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
};

// Single shared subscription — registers exactly ONE resize listener for the
// whole app, regardless of how many components call useDeviceType().
// Previously every UserAvatar / SmartTooltip / AvatarNameOverlay added its own
// listener, which on a long expense list meant 200+ listeners and re-renders
// per resize tick.
const subscribers = new Set<() => void>();
let cachedDevice: DeviceType = "desktop";
let listenerAttached = false;

function computeDevice(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < BREAKPOINTS.mobile) return "mobile";
  if (width < BREAKPOINTS.tablet) return "tablet";
  return "desktop";
}

function ensureListener() {
  if (listenerAttached || typeof window === "undefined") return;
  cachedDevice = computeDevice();

  const handler = () => {
    const next = computeDevice();
    if (next === cachedDevice) return;
    cachedDevice = next;
    subscribers.forEach((cb) => cb());
  };

  window.addEventListener("resize", handler, { passive: true });
  listenerAttached = true;
}

function subscribe(cb: () => void) {
  ensureListener();
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function getSnapshot(): DeviceType {
  return cachedDevice;
}

function getServerSnapshot(): DeviceType {
  return "desktop";
}

export function useDeviceType(): DeviceType {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
