function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name} in apps/web/.env.local`);
  }
  return value;
}

const publishableKey = required(
  "VITE_CLERK_PUBLISHABLE_KEY",
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

if (!publishableKey.startsWith("pk_")) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY must start with pk_");
}

export const env = {
  VITE_CONVEX_URL: required("VITE_CONVEX_URL", import.meta.env.VITE_CONVEX_URL),
  VITE_CONVEX_SITE_URL: import.meta.env.VITE_CONVEX_SITE_URL,
  VITE_CLERK_PUBLISHABLE_KEY: publishableKey,
};
