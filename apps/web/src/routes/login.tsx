import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import { setAdminKey } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [key, setKey] = useState("");

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-6">
      <Card className="w-full space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted">
            Paste an admin API key for this Convex instance.
          </p>
        </div>
        <Field label="Admin API key">
          <Input
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="exc_admin_…"
            autoComplete="off"
          />
        </Field>
        <Button
          disabled={!key.startsWith("exc_")}
          onClick={() => {
            setAdminKey(key.trim());
            void navigate({ to: "/integrations" });
          }}
        >
          Open console
        </Button>
      </Card>
    </div>
  );
}
