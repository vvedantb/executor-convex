import { ConvexReactClient } from "convex/react";
import { env } from "@/env";

export const convex = new ConvexReactClient(env.VITE_CONVEX_URL);

export function convexConfigured(): boolean {
  return env.VITE_CONVEX_URL.length > 0;
}

export function convexSiteUrl(): string {
  const siteUrl = env.VITE_CONVEX_SITE_URL ?? "";
  if (siteUrl) return siteUrl.replace(/\/$/, "");
  return env.VITE_CONVEX_URL.replace(/\.convex\.cloud\/?$/, ".convex.site");
}
