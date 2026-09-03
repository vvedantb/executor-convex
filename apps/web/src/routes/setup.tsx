import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@executor-convex/backend";
import { Button, Card } from "@/components/ui";
import { setAdminKey } from "@/lib/auth";

export const Route = createFileRoute("/setup")({
  component: Setup,
});

function Setup() {
  const setup = useMutation(api.auth.setup);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [keys, setKeys] = useState<{ adminKey: string; mcpKey: string } | null>(
    null,
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-6">
      <Card className="w-full space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            First run
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Set up this Executor
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            This creates an owner key for the console and an MCP key you can
            paste into Cursor, Claude, and the rest of your apps. Both are shown
            once.
          </p>
        </div>
        {keys ? (
          <div className="space-y-3 text-sm">
            <CopyBlock label="Admin key" value={keys.adminKey} />
            <CopyBlock label="MCP key" value={keys.mcpKey} />
            <Button
              onClick={() => {
                setAdminKey(keys.adminKey);
                void navigate({ to: "/integrations" });
              }}
            >
              Continue to integrations
            </Button>
          </div>
        ) : (
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void setup({})
                .then(setKeys)
                .catch((err: Error) => setError(err.message))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Creating keys…" : "Create instance keys"}
          </Button>
        )}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </Card>
    </div>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted">{label}</p>
      <code className="block overflow-x-auto rounded-lg bg-bg px-3 py-2 text-xs">
        {value}
      </code>
    </div>
  );
}
