import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { sha256Hex } from "./crypto";

export const lookupKey = internalQuery({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const keyHash = await sha256Hex(args.apiKey);
    const record = await ctx.db
      .query("apiKeys")
      .withIndex("by_hash", (q) => q.eq("keyHash", keyHash))
      .unique();
    if (!record || record.revokedAt) return null;
    return { _id: record._id, role: record.role };
  },
});

export const touchKey = internalMutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { lastUsedAt: Date.now() });
  },
});

export const loadCatalog = internalQuery({
  args: {},
  handler: async (ctx) => {
    const integrations = await ctx.db.query("integrations").collect();
    const connections = await ctx.db.query("connections").collect();
    const tools = await ctx.db.query("tools").collect();
    return { integrations, connections, tools };
  },
});

export const replaceConnectionTools = internalMutation({
  args: {
    connectionId: v.id("connections"),
    tools: v.array(
      v.object({
        name: v.string(),
        description: v.optional(v.string()),
        inputSchema: v.optional(v.any()),
      }),
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const connection = (await ctx.db.get(args.connectionId)) as Doc<"connections"> | null;
    if (!connection) throw new Error("Connection not found");
    const integration = (await ctx.db.get(
      connection.integrationId,
    )) as Doc<"integrations"> | null;
    if (!integration) throw new Error("Integration not found");

    const existing = await ctx.db
      .query("tools")
      .withIndex("by_connection", (q) => q.eq("connectionId", args.connectionId))
      .collect();
    const policyByName = new Map(existing.map((tool) => [tool.name, tool.policy]));
    for (const tool of existing) await ctx.db.delete(tool._id);

    const now = Date.now();
    if (args.error) {
      await ctx.db.patch(args.connectionId, {
        status: "error",
        lastError: args.error,
        lastIndexedAt: now,
      });
      return { toolCount: 0 };
    }

    for (const tool of args.tools) {
      await ctx.db.insert("tools", {
        connectionId: args.connectionId,
        integrationId: connection.integrationId,
        name: tool.name,
        address: `${integration.namespace}__${tool.name}`,
        description: tool.description,
        inputSchema: tool.inputSchema ?? undefined,
        policy: policyByName.get(tool.name) ?? "allow",
        updatedAt: now,
      });
    }
    await ctx.db.patch(args.connectionId, {
      status: "ready",
      lastIndexedAt: now,
    });
    return { toolCount: args.tools.length };
  },
});

export const recordExecution = internalMutation({
  args: {
    connectionId: v.optional(v.id("connections")),
    toolAddress: v.string(),
    status: v.union(v.literal("ok"), v.literal("error"), v.literal("blocked")),
    error: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("executions", args);
  },
});

export const getConnection = internalQuery({
  args: { connectionId: v.id("connections") },
  handler: async (ctx, args) => ctx.db.get(args.connectionId),
});
