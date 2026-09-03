import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@executor-convex/backend";
import { useConsoleAuth } from "@/lib/auth";
import { convexConfigured } from "@/lib/convex";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { isLoaded, authed } = useConsoleAuth();
  const status = useQuery(api.auth.status, convexConfigured() ? {} : "skip");
  if ((!isLoaded || status === undefined) && convexConfigured()) {
    return <p className="px-6 py-16 text-sm text-muted">Loading…</p>;
  }
  if (status && !status.setupComplete) return <Navigate to="/setup" />;
  if (!authed) return <Navigate to="/login" />;
  return <Navigate to="/integrations" />;
}
