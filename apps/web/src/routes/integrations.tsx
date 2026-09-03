import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@executor-convex/backend";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { useAdminKey } from "@/lib/auth";

export const Route = createFileRoute("/integrations")({
  component: Integrations,
});

function Integrations() {
  const apiKey = useAdminKey();
  const integrations = useQuery(
    api.catalog.listIntegrations,
    apiKey ? { apiKey } : "skip",
  );
  const create = useMutation(api.catalog.createIntegration);
  const [kind, setKind] = useState<"eva" | "mcp">("eva");
  const [name, setName] = useState("Eva");
  const [namespace, setNamespace] = useState("eva");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!apiKey) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Add Eva or any streamable-HTTP MCP server. Executor indexes its tools,
          namespaces them, and serves them from one Convex <code>/mcp</code>{" "}
          endpoint you plug into every app.
        </p>
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
          disabled={busy || !url}
          onClick={() => {
            setBusy(true);
            setError(null);
            void create({
              apiKey,
              name,
              namespace,
              kind,
              url,
              bearerToken: token || undefined,
            })
              .then(() => {
                setUrl("");
                setToken("");
              })
              .catch((err: Error) => setError(err.message))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "Adding…" : kind === "eva" ? "Add Eva" : "Add MCP"}
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
