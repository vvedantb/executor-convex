# executor-convex

A Convex-native Executor: one MCP catalog you configure once, then plug into every agent.

Add Eva (or any streamable-HTTP MCP server) as an integration. Executor prefixes those tools, applies allow/block policy, and exposes a single `/mcp` endpoint on your Convex `.site` URL.

## Layout

```
apps/web              TanStack Router + Vite console
packages/backend      Convex schema, catalog, MCP gateway
```

Same shape as Eva: a web app talking to a Convex backend that also serves MCP over HTTP.

## Run

```bash
pnpm install
pnpm convex          # packages/backend — cloud deployment pleasant-toucan-139
pnpm dev             # apps/web at http://127.0.0.1:5173
```

This project uses the Convex cloud deployment
`pleasant-toucan-139` (team `vedantb`, project `executor`).

Copy Convex + Clerk into `apps/web/.env.local` (same Clerk app as vmem):

```
VITE_CONVEX_URL=https://pleasant-toucan-139.eu-west-1.convex.cloud
VITE_CONVEX_SITE_URL=https://pleasant-toucan-139.eu-west-1.convex.site
VITE_CLERK_PUBLISHABLE_KEY=pk_test_…
```

And into `packages/backend/.env.local` plus the Convex deployment
(`npx convex env set` in `packages/backend`):

```
CONVEX_DEPLOYMENT=dev:pleasant-toucan-139
CONVEX_URL=https://pleasant-toucan-139.eu-west-1.convex.cloud
CONVEX_SITE_URL=https://pleasant-toucan-139.eu-west-1.convex.site
CLERK_FRONTEND_API_URL=https://<clerk>.clerk.accounts.dev
CLERK_PUBLISHABLE_KEY=pk_test_…
CLERK_SECRET_KEY=sk_test_…
WEB_APP_URL=http://127.0.0.1:5173
```

Open the console, sign in with the vmem Clerk app (or paste an admin key),
add Eva / vmem, then point Cursor / Claude / any MCP client at:

```
https://pleasant-toucan-139.eu-west-1.convex.site/mcp
Authorization: Bearer <mcp-or-admin-key>
```

## Eva

Eva already hosts MCP on Convex at `{CONVEX_SITE_URL}/mcp`. In Executor, use the Eva preset:

1. URL: `https://sensible-woodpecker-357.eu-west-1.convex.site/mcp`
2. Bearer token: an Eva MCP OAuth access token (or an Eva-issued internal bearer)
3. Namespace: `eva` (tools become `eva__list_repositories`, …)

vmem uses the same Clerk app. Sign in to the console with Clerk, then
**Connect with Clerk** on the vmem integration. Executor mints a short-lived
Clerk session token for each vmem call — no pasted bearer required.

vmem MCP: `https://outgoing-reindeer-268.eu-west-1.convex.site/mcp`

Refresh the connection to index tools, then set per-tool policy.

## Tests

```bash
pnpm test
```

The suite stands up a mock Eva MCP server, indexes it through the gateway, lists namespaced tools, proxies a call, and proves a blocked policy is enforced.
