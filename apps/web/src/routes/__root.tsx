import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ConvexProvider } from "convex/react";
import { AppShell } from "@/components/AppShell";
import { convex, convexConfigured } from "@/lib/convex";

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  if (!convexConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24">
        <h1 className="text-xl font-semibold">Convex URL missing</h1>
        <p className="mt-3 text-sm text-muted">
          Create <code className="text-fg">apps/web/.env.local</code> with{" "}
          <code className="text-fg">VITE_CONVEX_URL</code> from{" "}
          <code className="text-fg">pnpm convex</code>, then restart the web
          app.
        </p>
        <Outlet />
      </div>
    );
  }
  return (
    <ConvexProvider client={convex}>
      <AppShell />
    </ConvexProvider>
  );
}
