import { SignIn, useAuth } from "@clerk/clerk-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import { setAdminKey } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [key, setKey] = useState("");

  useEffect(() => {
    if (isSignedIn) {
      void navigate({ to: "/integrations" });
    }
  }, [isSignedIn, navigate]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Same Clerk app as vmem. The console uses that session for Convex
          and for vmem MCP.
        </p>
      </div>
      <div className="flex justify-center">
        <SignIn
          routing="hash"
          fallbackRedirectUrl="/integrations"
          signUpFallbackRedirectUrl="/integrations"
        />
      </div>
      <Card className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Or use an instance key
        </p>
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
