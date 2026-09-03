import { createRootRoute, Navigate, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { setAdminKey } from "@/lib/auth";
import { convexConfigured } from "@/lib/convex";
import { ConvexClientProvider } from "@/providers/ConvexClientProvider";

function RouteError({ error }: { error: Error }) {
  const message = error.message ?? String(error);
  if (message.includes("Invalid API key") || message.includes("Admin API key")) {
    setAdminKey(null);
    return <Navigate to="/login" />;
  }
  return (
    <div className="mx-auto max-w-lg px-6 py-24">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted">{message}</p>
    </div>
  );
}

export const Route = createRootRoute({
  component: Root,
  errorComponent: RouteError,
});

function Root() {
  if (!convexConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24">
        <h1 className="text-xl font-semibold">Convex URL missing</h1>
        <p className="mt-3 text-sm text-muted">
          Create <code className="text-fg">apps/web/.env.local</code> with{" "}
          <code className="text-fg">VITE_CONVEX_URL</code> and{" "}
          <code className="text-fg">VITE_CLERK_PUBLISHABLE_KEY</code>, then
          restart the web app.
        </p>
        <Outlet />
      </div>
    );
  }
  return (
    <ConvexClientProvider>
      <AppShell />
    </ConvexClientProvider>
  );
}
