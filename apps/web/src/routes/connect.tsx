import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@executor-convex/backend";
import { Card } from "@/components/ui";
import { useAdminKey } from "@/lib/auth";
import { addMcpCommand, cursorConfig, mcpUrl } from "@/lib/mcpSnippet";

export const Route = createFileRoute("/connect")({
  component: Connect,
});

function Connect() {
  const apiKey = useAdminKey();
  const keys = useQuery(api.auth.listKeys, apiKey ? { apiKey } : "skip");
  const mcpKey = keys?.find((key) => key.role === "mcp");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connect apps</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Point every MCP client at this Convex endpoint. They all share the
          same Eva (and other) tools, with the policies you set here.
        </p>
      </div>
      <Card className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          MCP URL
        </p>
        <code className="block overflow-x-auto rounded-lg bg-bg px-3 py-2 text-sm">
          {mcpUrl()}
        </code>
        <p className="text-sm text-muted">
          Authorize with a Bearer MCP or admin key from the API keys page.
          {mcpKey
            ? ` The default MCP key prefix is ${mcpKey.prefix}…`
            : ""}
        </p>
      </Card>
      <Card className="space-y-3">
        <p className="text-sm font-medium">Cursor / add-mcp</p>
        <code className="block overflow-x-auto whitespace-pre-wrap rounded-lg bg-bg px-3 py-2 text-xs leading-6">
          {addMcpCommand("exc_mcp_<your-key>")}
        </code>
      </Card>
      <Card className="space-y-3">
        <p className="text-sm font-medium">mcp.json</p>
        <pre className="overflow-x-auto rounded-lg bg-bg px-3 py-2 text-xs leading-6">
          {cursorConfig("exc_mcp_<your-key>")}
        </pre>
      </Card>
    </div>
  );
}
