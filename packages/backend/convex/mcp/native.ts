import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2) return null;
  if (parts[0]?.toLowerCase() !== "bearer") return null;
  return parts[1] ?? null;
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, MCP-Protocol-Version",
    "Access-Control-Max-Age": "86400",
  };
}

export const optionsHandler = httpAction(async (_ctx, request) => {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
});

export const oauthMetadata = httpAction(async (_ctx, request) => {
  const baseUrl = new URL(request.url).origin;
  return Response.json(
    {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/mcp/oauth/authorize`,
      token_endpoint: `${baseUrl}/mcp/oauth/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      bearer_methods_supported: ["header"],
    },
    { headers: corsHeaders(request) },
  );
});

export const protectedResourceMetadata = httpAction(async (_ctx, request) => {
  const baseUrl = new URL(request.url).origin;
  return Response.json(
    {
      resource: `${baseUrl}/mcp`,
      authorization_servers: [baseUrl],
      bearer_methods_supported: ["header"],
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
