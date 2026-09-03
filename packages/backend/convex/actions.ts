"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { indexConnection } from "./mcp/gateway";

export const refreshConnection = action({
  args: {
    apiKey: v.string(),
    connectionId: v.id("connections"),
  },
  handler: async (ctx, args): Promise<{ toolCount: number }> => {
    const key = await ctx.runQuery(internal.internalCatalog.lookupKey, {
      apiKey: args.apiKey,
    });
    if (!key || key.role !== "admin") {
      throw new Error("Admin API key required");
    }

    const connection = await ctx.runQuery(internal.internalCatalog.getConnection, {
      connectionId: args.connectionId,
    });
    if (!connection) throw new Error("Connection not found");

    try {
      const tools = await indexConnection(connection.url, connection.headers);
      return await ctx.runMutation(internal.internalCatalog.replaceConnectionTools, {
        connectionId: args.connectionId,
        tools,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.internalCatalog.replaceConnectionTools, {
        connectionId: args.connectionId,
        tools: [],
        error: message,
      });
      throw new Error(message);
    }
  },
});
