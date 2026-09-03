import { useSyncExternalStore } from "react";

const KEY = "executor-convex.adminKey";

let current = localStorage.getItem(KEY);
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function getAdminKey(): string | null {
  return current;
}

export function setAdminKey(key: string | null) {
  current = key;
  if (key) localStorage.setItem(KEY, key);
  else localStorage.removeItem(KEY);
  emit();
}

export function useAdminKey(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}
