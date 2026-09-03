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
pnpm convex          # packages/backend — local or cloud Convex deployment
pnpm dev             # apps/web at http://127.0.0.1:5173
```

Copy Convex URLs into `apps/web/.env.local`:

```
VITE_CONVEX_URL=https://<deployment>.convex.cloud
VITE_CONVEX_SITE_URL=https://<deployment>.convex.site
```

For the local backend those are `http://127.0.0.1:3210` and `http://127.0.0.1:3211`.

This project is linked to the Convex cloud deployment
`pleasant-toucan-139` (team `vedantb`, project `executor`).

Open the console, run first-time setup, add the Eva MCP URL + bearer token, then point Cursor / Claude / any MCP client at:

```
https://pleasant-toucan-139.eu-west-1.convex.site/mcp
Authorization: Bearer <mcp-or-admin-key>
```

## Eva

Eva already hosts MCP on Convex at `{CONVEX_SITE_URL}/mcp`. In Executor, use the Eva preset:

1. URL: `https://sensible-woodpecker-357.eu-west-1.convex.site/mcp`
2. Bearer token: an Eva MCP OAuth access token (or an Eva-issued internal bearer)
3. Namespace: `eva` (tools become `eva__list_repositories`, …)

vmem is the same kind of connection at
`https://outgoing-reindeer-268.eu-west-1.convex.site/mcp` (Clerk OAuth bearer).

Refresh the connection to index tools, then set per-tool policy.

## Tests

```bash
pnpm test
```

The suite stands up a mock Eva MCP server, indexes it through the gateway, lists namespaced tools, proxies a call, and proves a blocked policy is enforced.
