import { ConvexReactClient } from "convex/react";

const url = import.meta.env.VITE_CONVEX_URL ?? "";
const siteUrl = import.meta.env.VITE_CONVEX_SITE_URL ?? "";

export const convex = new ConvexReactClient(url);

export function convexConfigured(): boolean {
  return url.length > 0;
}

export function convexSiteUrl(): string {
  if (siteUrl) return siteUrl.replace(/\/$/, "");
  if (!url) return "https://<deployment>.convex.site";
  if (url.includes("127.0.0.1:3210") || url.includes("localhost:3210")) {
    return url.replace(":3210", ":3211").replace(/\/$/, "");
  }
  return url.replace(/\.convex\.cloud\/?$/, ".convex.site");
}
