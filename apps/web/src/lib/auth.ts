import { useAuth } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
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

export function useAdminArgs(): { apiKey?: string } | "skip" {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const apiKey = useAdminKey();
  if (isLoading) return "skip";
  if (isAuthenticated) return apiKey ? { apiKey } : {};
  if (apiKey) return { apiKey };
  return "skip";
}

export function useConsoleAuth() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const apiKey = useAdminKey();
  return {
    isLoaded: isLoaded && !isLoading,
    isSignedIn: Boolean(isSignedIn || isAuthenticated),
    apiKey,
    authed: Boolean(isAuthenticated || isSignedIn || apiKey),
  };
}
