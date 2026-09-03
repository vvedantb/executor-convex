"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { handleGateway, type GatewayCatalog } from "./gateway";

function asCatalog(raw: {
  integrations: Array<{ _id: string }>;
  connections: Array<{
    _id: string;
    url: string;
    headers: Array<{ key: string; value: string }>;
  }>;
  tools: Array<{
    name: string;
    address: string;
    description?: string;
    inputSchema?: unknown;
    policy: "allow" | "block";
    connectionId: string;
  }>;
}): GatewayCatalog {
  return {
    tools: raw.tools.map((tool) => ({
      name: tool.name,
      address: tool.address,
      description: tool.description,
      inputSchema: tool.inputSchema,
      policy: tool.policy,
      connectionId: tool.connectionId,
    })),
    connections: raw.connections.map((connection) => ({
      id: connection._id,
      url: connection.url,
      headers: connection.headers,
    })),
  };
}

export const handleMcpRequest = internalAction({
  args: { apiKey: v.string(), body: v.string() },
  returns: v.object({
    status: v.number(),
    body: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const key = await ctx.runQuery(internal.internalCatalog.lookupKey, {
      apiKey: args.apiKey,
    });
    if (!key) {
      return {
        status: 401,
        body: JSON.stringify({ error: "Invalid or expired token" }),
      };
    }
    await ctx.runMutation(internal.internalCatalog.touchKey, { keyId: key._id });

    let parsed: unknown;
    try {
      parsed = JSON.parse(args.body);
    } catch {
      return { status: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }

    const catalog = asCatalog(
      await ctx.runQuery(internal.internalCatalog.loadCatalog, {}),
    );
    const result = await handleGateway(parsed, catalog, {
      onExecution: async (event) => {
        await ctx.runMutation(internal.internalCatalog.recordExecution, {
          connectionId: event.connectionId as Id<"connections"> | undefined,
          toolAddress: event.toolAddress,
          status: event.status,
          error: event.error,
          startedAt: event.startedAt,
          finishedAt: event.finishedAt,
        });
      },
    });

    return {
      status: result.status,
      body: result.body === null ? null : JSON.stringify(result.body),
    };
  },
});
