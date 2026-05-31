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
let listenerAttached = false;

function computeDevice(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < BREAKPOINTS.mobile) return "mobile";
  if (width < BREAKPOINTS.tablet) return "tablet";
  return "desktop";
}

let cachedDevice: DeviceType =
  typeof window !== "undefined" ? computeDevice() : "desktop";

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
  if (typeof window !== "undefined") {
    cachedDevice = computeDevice();
  }
  return cachedDevice;
}

function getServerSnapshot(): DeviceType {
  return "desktop";
}

export function useDeviceType(): DeviceType {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Same rule as mobile group dashboard (`device === "mobile"`). */
export function isMobileViewportWidth(width = typeof window !== "undefined" ? window.innerWidth : 0) {
  return width < BREAKPOINTS.mobile;
}

/** Tailwind `md` breakpoint — matches `hidden md:block` layout switches. */
export const MD_BREAKPOINT_PX = 768;
const MD_BREAKPOINT = MD_BREAKPOINT_PX;

export function useMdUp(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => undefined;
      const mq = window.matchMedia(`(min-width: ${MD_BREAKPOINT}px)`);
      const handler = () => onStoreChange();
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    },
    () =>
      typeof window !== "undefined"
        ? window.matchMedia(`(min-width: ${MD_BREAKPOINT}px)`).matches
        : true,
    () => true
  );
}
