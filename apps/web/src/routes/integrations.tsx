import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@executor-convex/backend";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { useAdminArgs } from "@/lib/auth";

export const Route = createFileRoute("/integrations")({
  component: Integrations,
  validateSearch: (search: Record<string, unknown>) => ({
    oauth: typeof search.oauth === "string" ? search.oauth : undefined,
    oauth_error:
      typeof search.oauth_error === "string" ? search.oauth_error : undefined,
  }),
});

function Integrations() {
  const adminArgs = useAdminArgs();
  const navigate = useNavigate();
  const notice = Route.useSearch();
  const integrations = useQuery(api.catalog.listIntegrations, adminArgs);
  const presets = useQuery(api.catalog.listPresets, adminArgs);
  const create = useMutation(api.catalog.createIntegration);
  const connectPreset = useAction(api.oauthActions.connectPreset);
  const [kind, setKind] = useState<"eva" | "mcp">("eva");
  const [name, setName] = useState("Eva");
  const [namespace, setNamespace] = useState("eva");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (adminArgs === "skip") return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Connect hosted MCP servers. Executor indexes their tools, namespaces
          them, and serves them from one Convex <code>/mcp</code> endpoint.
        </p>
      </div>

      {notice.oauth === "connected" ? (
        <p className="text-sm text-accent">OAuth connected. Tools are indexed.</p>
      ) : null}
      {notice.oauth_error ? (
        <p className="text-sm text-danger">{notice.oauth_error}</p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {(presets ?? []).map((preset) => (
          <Card key={preset.slug} className="flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{preset.name}</p>
                <Badge tone={preset.available ? "ok" : "warn"}>
                  {preset.auth === "google"
                    ? "Google OAuth"
                    : preset.auth === "slack"
                      ? "Slack OAuth"
                      : preset.auth === "bearer"
                        ? "Token"
                        : "OAuth"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{preset.description}</p>
            </div>
            <Button
              disabled={Boolean(busy) || !preset.available}
              onClick={() => {
                setBusy(preset.slug);
                setError(null);
                void connectPreset({ ...adminArgs, slug: preset.slug })
                  .then((result) => {
                    if (result.authorizeUrl) {
                      window.location.href = result.authorizeUrl;
                      return;
                    }
                    void navigate({
                      to: "/integrations/$id",
                      params: { id: result.integrationId },
                    });
                  })
                  .catch((err: Error) => setError(err.message))
                  .finally(() => setBusy(null));
              }}
            >
              {busy === preset.slug
                ? "Connecting…"
                : preset.available
                  ? preset.auth === "bearer"
                    ? "Add"
                    : "Connect"
                  : preset.auth === "slack"
                    ? "Needs Slack OAuth app"
                    : "Needs Google OAuth client"}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={kind === "eva" ? "primary" : "ghost"}
            onClick={() => {
              setKind("eva");
              setName("Eva");
              setNamespace("eva");
            }}
          >
            Eva
          </Button>
          <Button
            variant={kind === "mcp" ? "primary" : "ghost"}
            onClick={() => {
              setKind("mcp");
              if (name === "Eva") setName("");
              if (namespace === "eva") setNamespace("");
            }}
          >
            Custom MCP
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field
            label="Namespace"
            hint="Tools become namespace__toolName"
          >
            <Input
              value={namespace}
              onChange={(event) => setNamespace(event.target.value)}
            />
          </Field>
        </div>
        <Field
          label={kind === "eva" ? "Eva MCP URL" : "MCP URL"}
          hint={
            kind === "eva"
              ? "https://<eva-deployment>.convex.site/mcp"
              : "Streamable-HTTP MCP endpoint"
          }
        >
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://….convex.site/mcp"
          />
        </Field>
        <Field
          label="Bearer token"
          hint={
            kind === "eva"
              ? "Eva MCP OAuth access token, or an Eva-issued internal bearer"
              : "Optional. Sent as Authorization: Bearer …"
          }
        >
          <Input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="eyJ…"
            autoComplete="off"
          />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button
          disabled={Boolean(busy) || !url}
          onClick={() => {
            setBusy("custom");
            setError(null);
            void create({
              ...adminArgs,
              name,
              namespace,
              kind,
              url,
              bearerToken: token || undefined,
              useClerkAuth: kind === "mcp" && !token,
            })
              .then(() => {
                setUrl("");
                setToken("");
              })
              .catch((err: Error) => setError(err.message))
              .finally(() => setBusy(null));
          }}
        >
          {busy === "custom" ? "Adding…" : kind === "eva" ? "Add Eva" : "Add MCP"}
        </Button>
      </Card>

      <div className="space-y-3">
        {(integrations ?? []).map((integration) => (
          <Link
            key={integration._id}
            to="/integrations/$id"
            params={{ id: integration._id }}
            className="block"
          >
            <Card className="flex items-center justify-between hover:border-accent/40">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{integration.name}</p>
                  <Badge tone={integration.kind === "eva" ? "ok" : "muted"}>
                    {integration.kind}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {integration.namespace} · {integration.toolCount} tools ·{" "}
                  {integration.connectionCount} connection
                </p>
              </div>
              <span className="text-sm text-muted">Open →</span>
            </Card>
          </Link>
        ))}
        {integrations?.length === 0 ? (
          <p className="text-sm text-muted">No integrations yet.</p>
        ) : null}
      </div>
    </div>
  );
}
