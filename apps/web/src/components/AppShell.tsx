import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAdminKey } from "@/lib/auth";
import { cn } from "./ui";

const NAV = [
  { to: "/integrations", label: "Integrations" },
  { to: "/connect", label: "Connect" },
  { to: "/keys", label: "API keys" },
];

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const key = useAdminKey();
  const publicRoute =
    pathname === "/setup" || pathname === "/login" || pathname === "/";

  if (publicRoute || !key) {
    return (
      <div className="min-h-screen bg-bg">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r border-line bg-card/60 px-4 py-6 md:block">
        <Link to="/integrations" className="block px-2 text-sm font-semibold tracking-tight">
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
      </aside>
      <div className="md:pl-56">
        <header className="flex items-center justify-between border-b border-line px-6 py-4 md:hidden">
          <span className="text-sm font-semibold">Executor</span>
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
