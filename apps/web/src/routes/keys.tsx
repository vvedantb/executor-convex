import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@executor-convex/backend";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { setAdminKey, useAdminArgs } from "@/lib/auth";

export const Route = createFileRoute("/keys")({
  component: Keys,
});

function Keys() {
  const adminArgs = useAdminArgs();
  const keys = useQuery(api.auth.listKeys, adminArgs);
  const create = useMutation(api.auth.createKey);
  const revoke = useMutation(api.auth.revokeKey);
  const [name, setName] = useState("App");
  const [role, setRole] = useState<"admin" | "mcp">("mcp");
  const [created, setCreated] = useState<string | null>(null);

  if (adminArgs === "skip") return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
        <p className="mt-2 text-sm text-muted">
          Admin keys open this console. MCP keys are what you put in Cursor,
          Claude, and other agents.
        </p>
      </div>
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Button
            variant={role === "mcp" ? "primary" : "ghost"}
            onClick={() => setRole("mcp")}
          >
            MCP
          </Button>
          <Button
            variant={role === "admin" ? "primary" : "ghost"}
            onClick={() => setRole("admin")}
          >
            Admin
          </Button>
        </div>
        <Button
          onClick={() => {
            void create({ ...adminArgs, name, role }).then((result) =>
              setCreated(result.key),
            );
          }}
        >
          Mint key
        </Button>
        {created ? (
          <code className="block overflow-x-auto rounded-lg bg-bg px-3 py-2 text-xs">
            {created}
          </code>
        ) : null}
      </Card>
      <div className="space-y-2">
        {(keys ?? []).map((key) => (
          <Card
            key={key._id}
            className="flex items-center justify-between gap-3 py-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{key.name}</p>
                <Badge tone={key.role === "admin" ? "warn" : "ok"}>{key.role}</Badge>
              </div>
              <p className="mt-1 font-mono text-xs text-muted">{key.prefix}…</p>
            </div>
            <Button
              variant="danger"
              onClick={() => void revoke({ ...adminArgs, keyId: key._id })}
            >
              Revoke
            </Button>
          </Card>
        ))}
      </div>
      <Button variant="ghost" onClick={() => setAdminKey(null)}>
        Sign out
      </Button>
    </div>
  );
}
