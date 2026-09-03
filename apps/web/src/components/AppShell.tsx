import { SignInButton, UserButton } from "@clerk/clerk-react";
import { Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@executor-convex/backend";
import { setAdminKey, useAdminKey, useConsoleAuth } from "@/lib/auth";
import { cn } from "./ui";

const NAV = [
  { to: "/integrations", label: "Integrations" },
  { to: "/connect", label: "Connect" },
  { to: "/keys", label: "API keys" },
];

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isLoaded, isSignedIn, authed } = useConsoleAuth();
  const key = useAdminKey();
  const validity = useQuery(
    api.auth.validate,
    isSignedIn ? {} : key ? { apiKey: key } : "skip",
  );
  const publicRoute =
    pathname === "/setup" || pathname === "/login" || pathname === "/";

  useEffect(() => {
    if (!isSignedIn && validity && !validity.ok) setAdminKey(null);
  }, [isSignedIn, validity]);

  if (!isLoaded && !publicRoute) {
    return (
      <div className="min-h-screen bg-bg">
        <p className="px-6 py-16 text-sm text-muted">Checking session…</p>
      </div>
    );
  }

  if (key && !isSignedIn && validity === undefined && !publicRoute) {
    return (
      <div className="min-h-screen bg-bg">
        <p className="px-6 py-16 text-sm text-muted">Checking session…</p>
      </div>
    );
  }

  if (key && !isSignedIn && validity && !validity.ok && !publicRoute) {
    return <Navigate to="/login" />;
  }

  if (!authed && !publicRoute) {
    return <Navigate to="/login" />;
  }

  if (publicRoute || !authed) {
    return (
      <div className="min-h-screen bg-bg">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r border-line bg-card/60 px-4 py-6 md:block">
        <Link to="/integrations" className="flex items-center gap-2 px-2 text-sm font-semibold tracking-tight">
          <img src="/favicon.png" alt="" width={22} height={22} className="rounded-md" />
          Executor
        </Link>
        <p className="mt-1 px-2 text-xs text-muted">Convex MCP catalog</p>
        <nav className="mt-8 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "block rounded-lg px-2 py-2 text-sm",
                pathname.startsWith(item.to)
                  ? "bg-line text-fg"
                  : "text-muted hover:bg-line/60 hover:text-fg",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-6 left-4 right-4 flex items-center justify-between px-2">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button className="text-xs text-muted hover:text-fg">
                Clerk sign in
              </button>
            </SignInButton>
          )}
        </div>
      </aside>
      <div className="md:pl-56">
        <header className="flex items-center justify-between border-b border-line px-6 py-4 md:hidden">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <img src="/favicon.png" alt="" width={20} height={20} className="rounded-md" />
            Executor
          </span>
          <nav className="flex gap-3 text-sm text-muted">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
