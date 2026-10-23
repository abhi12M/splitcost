// Counts background work the status dot shows as "syncing": sending local
// groups, and catching up on synced groups after reconnecting.

type Listener = () => void;

let active = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function isSyncActive() {
  return active > 0;
}

export function subscribeSyncActivity(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Marks `work` as syncing until it settles. */
export async function trackSync<T>(work: () => Promise<T>): Promise<T> {
  active += 1;
  emit();
  try {
    return await work();
  } finally {
    active -= 1;
    emit();
  }
}
