import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@executor-convex/backend";
import type { Id } from "@executor-convex/backend";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { useAdminArgs, useConsoleAuth } from "@/lib/auth";

export const Route = createFileRoute("/integrations_/$id")({
  component: IntegrationDetail,
});

function IntegrationDetail() {
  const { id } = Route.useParams();
  const adminArgs = useAdminArgs();
  const { isSignedIn } = useConsoleAuth();
  const navigate = useNavigate();
  const integrationId = id as Id<"integrations">;
  const detail = useQuery(
    api.catalog.getIntegration,
    adminArgs === "skip" ? "skip" : { ...adminArgs, integrationId },
  );
  const refresh = useAction(api.actions.refreshConnection);
  const startOauth = useAction(api.oauthActions.startOauth);
  const setPolicy = useMutation(api.catalog.setToolPolicy);
  const updateAuth = useMutation(api.catalog.updateConnectionAuth);
  const bindClerk = useMutation(api.catalog.bindConnectionClerk);
  const remove = useMutation(api.catalog.removeIntegration);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");

  if (adminArgs === "skip") return null;
  if (detail === undefined) {
    return <p className="text-sm text-muted">Loading…</p>;
  }
  if (detail === null) {
    return <p className="text-sm text-danger">Integration not found.</p>;
  }

  const connection = detail.connections[0];

  return (
    <div className="space-y-8">
      <div>
        <Link to="/integrations" className="text-sm text-muted hover:text-fg">
          ← Integrations
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {detail.integration.name}
          </h1>
          <Badge tone={detail.integration.kind === "eva" ? "ok" : "muted"}>
            {detail.integration.kind}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted">
          Namespace <code className="text-fg">{detail.integration.namespace}</code>
        </p>
      </div>

      {connection ? (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{connection.name}</p>
              <p className="mt-1 break-all text-sm text-muted">{connection.url}</p>
            </div>
            <Badge
              tone={
                connection.status === "ready"
                  ? "ok"
                  : connection.status === "error"
                    ? "danger"
                    : "warn"
              }
            >
              {connection.status}
            </Badge>
          </div>
          {connection.lastError ? (
            <p className="text-sm text-danger">{connection.lastError}</p>
          ) : null}
          <Field
            label="Bearer token"
            hint={
              connection.hasOauth
                ? "This connection uses OAuth. Reconnect if tools start failing, or paste a token."
                : connection.hasClerkAuth
                  ? "This connection uses the shared vmem Clerk app. Refresh tools after signing in."
                  : connection.hasAuth
                    ? "A token is stored. Paste a new one to rotate it."
                    : "Paste a bearer token, connect with OAuth, or bind Clerk for vmem."
            }
          >
            <Input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="eyJ…"
              autoComplete="off"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || !token.trim()}
              onClick={() => {
                setBusy(true);
                setError(null);
                void updateAuth({
                  ...adminArgs,
                  connectionId: connection._id as Id<"connections">,
                  bearerToken: token.trim(),
                })
                  .then(() => setToken(""))
                  .catch((err: Error) => setError(err.message))
                  .finally(() => setBusy(false));
              }}
            >
              Save token
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError(null);
                void refresh({
                  ...adminArgs,
                  connectionId: connection._id as Id<"connections">,
                })
                  .catch((err: Error) => setError(err.message))
                  .finally(() => setBusy(false));
              }}
            >
              {busy ? "Working…" : "Refresh tools"}
            </Button>
            {connection.hasOauth || connection.authKind === "oauth" ? (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  void startOauth({
                    ...adminArgs,
                    connectionId: connection._id as Id<"connections">,
                  })
                    .then((result) => {
                      window.location.href = result.authorizeUrl;
                    })
                    .catch((err: Error) => {
                      setError(err.message);
                      setBusy(false);
                    });
                }}
              >
                {connection.hasAuth ? "Reconnect OAuth" : "Connect with OAuth"}
              </Button>
            ) : null}
            {isSignedIn ? (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  void bindClerk({
                    ...adminArgs,
                    connectionId: connection._id as Id<"connections">,
                  })
                    .then(() =>
                      refresh({
                        ...adminArgs,
                        connectionId: connection._id as Id<"connections">,
                      }),
                    )
                    .catch((err: Error) => setError(err.message))
                    .finally(() => setBusy(false));
                }}
              >
                Connect with Clerk
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Tools</h2>
        {detail.tools.length === 0 ? (
          <p className="text-sm text-muted">
            Refresh the connection to pull the Eva / MCP catalog.
          </p>
        ) : (
          detail.tools.map((tool) => (
            <Card
              key={tool._id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div>
                <p className="font-mono text-sm">{tool.address}</p>
                {tool.description ? (
                  <p className="mt-1 text-sm text-muted">{tool.description}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  variant={tool.policy === "allow" ? "primary" : "ghost"}
                  onClick={() =>
                    void setPolicy({
                      ...adminArgs,
                      toolId: tool._id,
                      policy: "allow",
                    })
                  }
                >
                  Allow
                </Button>
                <Button
                  variant={tool.policy === "block" ? "danger" : "ghost"}
                  onClick={() =>
                    void setPolicy({
                      ...adminArgs,
                      toolId: tool._id,
                      policy: "block",
                    })
                  }
                >
                  Block
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button
        variant="danger"
        onClick={() => {
          void remove({ ...adminArgs, integrationId }).then(() =>
            navigate({ to: "/integrations" }),
          );
        }}
      >
        Remove integration
      </Button>
    </div>
  );
}
