import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2) return null;
  if (parts[0]?.toLowerCase() !== "bearer") return null;
  return parts[1] ?? null;
}

function requiredEnvUrl(name: string): string {
  const url = process.env[name];
  if (!url) throw new Error(`${name} is not set in Convex env`);
  return url.replace(/\/$/, "");
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Accept, MCP-Protocol-Version",
    "Access-Control-Max-Age": "86400",
  };
}

export const optionsHandler = httpAction(async (_ctx, request) => {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
});

export const oauthMetadata = httpAction(async (_ctx, request) => {
  const clerkFrontendApiUrl = requiredEnvUrl("CLERK_FRONTEND_API_URL");
  const res = await fetch(
    `${clerkFrontendApiUrl}/.well-known/oauth-authorization-server`,
  );
  if (!res.ok) {
    return Response.json(
      { error: "Failed to fetch authorization server metadata" },
      { status: 502, headers: corsHeaders(request) },
    );
  }
  const metadata: unknown = await res.json();
  return Response.json(metadata, { headers: corsHeaders(request) });
});

export const protectedResourceMetadata = httpAction(async (_ctx, request) => {
  const baseUrl = new URL(request.url).origin;
  return Response.json(
    {
      resource: `${baseUrl}/mcp`,
      authorization_servers: [requiredEnvUrl("CLERK_FRONTEND_API_URL")],
      bearer_methods_supported: ["header"],
      resource_documentation: requiredEnvUrl("WEB_APP_URL"),
    },
    { headers: corsHeaders(request) },
  );
});

export const health = httpAction(async (_ctx, request) => {
  return Response.json(
    { status: "ok", service: "executor-convex" },
    { headers: corsHeaders(request) },
  );
});

export const mcpHandler = httpAction(async (ctx, request) => {
  const headers = corsHeaders(request);
  const baseUrl = new URL(request.url).origin;
  const resourceMetadataUrl = `${baseUrl}/.well-known/oauth-protected-resource`;

  if (request.method === "GET" || request.method === "DELETE") {
    return Response.json(
      { error: "Method not supported in stateless mode" },
      { status: 405, headers },
    );
  }

  const token = extractBearerToken(request.headers.get("Authorization"));
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
      },
    });
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400, headers });
  }

  const result = await ctx.runAction(internal.mcp.nodeActions.handleMcpRequest, {
    apiKey: token,
    body,
  });

  if (result.status === 202) {
    return new Response(null, { status: 202, headers });
  }

  return new Response(result.body ?? "", {
    status: result.status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
});
