import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireKey } from "./auth";
import { headerValidator, policyValidator } from "./schema";

const NAMESPACE = /^[a-z][a-z0-9_]{0,47}$/;

function assertNamespace(namespace: string): string {
  const value = namespace.trim().toLowerCase();
  if (!NAMESPACE.test(value)) {
    throw new Error(
      "Namespace must start with a letter and use only lowercase letters, numbers, and underscores",
    );
  }
  return value;
}

function publicConnection(doc: {
  _id: string;
  integrationId: string;
  name: string;
  url: string;
  headers: Array<{ key: string; value: string }>;
  status: "pending" | "ready" | "error";
  lastError?: string;
  lastIndexedAt?: number;
  clerkUserId?: string;
  createdAt: number;
}) {
  return {
    _id: doc._id,
    integrationId: doc.integrationId,
    name: doc.name,
    url: doc.url,
    headerKeys: doc.headers.map((header) => header.key),
    hasAuth:
      Boolean(doc.clerkUserId) ||
      doc.headers.some(
        (header) => header.key.toLowerCase() === "authorization",
      ),
    hasClerkAuth: Boolean(doc.clerkUserId),
    status: doc.status,
    lastError: doc.lastError,
    lastIndexedAt: doc.lastIndexedAt,
    createdAt: doc.createdAt,
  };
}

export const listIntegrations = query({
  args: { apiKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.apiKey);
    const integrations = await ctx.db.query("integrations").collect();
    const connections = await ctx.db.query("connections").collect();
    const tools = await ctx.db.query("tools").collect();
    return integrations
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((integration) => {
        const linked = connections.filter(
          (connection) => connection.integrationId === integration._id,
        );
        const toolCount = tools.filter(
          (tool) => tool.integrationId === integration._id,
        ).length;
        return {
          ...integration,
          connectionCount: linked.length,
          toolCount,
          readyCount: linked.filter((connection) => connection.status === "ready")
            .length,
        };
      });
  },
});

export const getIntegration = query({
  args: {
    apiKey: v.optional(v.string()),
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.apiKey);
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) return null;
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_integration", (q) =>
        q.eq("integrationId", args.integrationId),
      )
      .collect();
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_integration", (q) =>
        q.eq("integrationId", args.integrationId),
      )
      .collect();
    return {
      integration,
      connections: connections.map(publicConnection),
      tools: tools
        .sort((a, b) => a.address.localeCompare(b.address))
        .map((tool) => ({
          _id: tool._id,
          connectionId: tool.connectionId,
          name: tool.name,
          address: tool.address,
          description: tool.description,
          inputSchema: tool.inputSchema,
          policy: tool.policy,
        })),
    };
  },
});

export const createIntegration = mutation({
  args: {
    apiKey: v.optional(v.string()),
    name: v.string(),
    namespace: v.string(),
    kind: v.union(v.literal("eva"), v.literal("mcp")),
    url: v.string(),
    bearerToken: v.optional(v.string()),
    extraHeaders: v.optional(v.array(headerValidator)),
    useClerkAuth: v.optional(v.boolean()),
    clerkUserId: v.optional(v.string()),
    clerkApp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.apiKey);
    const namespace = assertNamespace(args.namespace);
    const clash = await ctx.db
      .query("integrations")
      .withIndex("by_namespace", (q) => q.eq("namespace", namespace))
      .unique();
    if (clash) throw new Error(`Namespace "${namespace}" is already in use`);
    const url = args.url.trim();
    if (!/^https?:\/\//i.test(url)) {
      throw new Error("Connection URL must be http(s)");
    }
    const now = Date.now();
    const integrationId = await ctx.db.insert("integrations", {
      name: args.name.trim() || (args.kind === "eva" ? "Eva" : "MCP"),
      namespace,
      kind: args.kind,
      createdAt: now,
    });
    const headers = [...(args.extraHeaders ?? [])];
    if (args.bearerToken?.trim()) {
      headers.unshift({
        key: "Authorization",
        value: `Bearer ${args.bearerToken.trim()}`,
      });
    }
    const connectionId = await ctx.db.insert("connections", {
      integrationId,
      name: args.kind === "eva" ? "Eva MCP" : "Default",
      url,
      headers,
      status: "pending",
      clerkUserId:
        args.clerkUserId ??
        (args.useClerkAuth && admin.kind === "clerk"
          ? admin.clerkUserId
          : undefined),
      clerkApp: args.clerkApp,
      createdAt: now,
    });
    return { integrationId, connectionId };
  },
});

export const updateConnectionAuth = mutation({
  args: {
    apiKey: v.optional(v.string()),
    connectionId: v.id("connections"),
    bearerToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.apiKey);
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) throw new Error("Connection not found");
    const headers = connection.headers.filter(
      (header) => header.key.toLowerCase() !== "authorization",
    );
    headers.unshift({
      key: "Authorization",
      value: `Bearer ${args.bearerToken.trim()}`,
    });
    await ctx.db.patch(args.connectionId, { headers, status: "pending" });
  },
});

export const removeIntegration = mutation({
  args: {
    apiKey: v.optional(v.string()),
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.apiKey);
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_integration", (q) =>
        q.eq("integrationId", args.integrationId),
      )
      .collect();
    for (const connection of connections) {
      const tools = await ctx.db
        .query("tools")
        .withIndex("by_connection", (q) => q.eq("connectionId", connection._id))
        .collect();
      for (const tool of tools) await ctx.db.delete(tool._id);
      await ctx.db.delete(connection._id);
    }
    await ctx.db.delete(args.integrationId);
  },
});

export const setToolPolicy = mutation({
  args: {
    apiKey: v.optional(v.string()),
    toolId: v.id("tools"),
    policy: policyValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.apiKey);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    await ctx.db.patch(args.toolId, {
      policy: args.policy,
      updatedAt: Date.now(),
    });
  },
});

export const bindConnectionClerk = mutation({
  args: {
    apiKey: v.optional(v.string()),
    connectionId: v.id("connections"),
    clerkUserId: v.optional(v.string()),
    clerkApp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.apiKey);
    const clerkUserId =
      args.clerkUserId ??
      (admin.kind === "clerk" ? admin.clerkUserId : undefined);
    if (!clerkUserId) {
      throw new Error("Sign in with Clerk to bind this connection");
    }
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) throw new Error("Connection not found");
    const headers = connection.headers.filter(
      (header) => header.key.toLowerCase() !== "authorization",
    );
    await ctx.db.patch(args.connectionId, {
      headers,
      clerkUserId,
      clerkApp: args.clerkApp ?? connection.clerkApp,
      status: "pending",
      lastError: undefined,
    });
  },
});

export const listCatalogForMcp = query({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    await requireKey(ctx, args.apiKey);
    const integrations = await ctx.db.query("integrations").collect();
    const connections = await ctx.db.query("connections").collect();
    const tools = await ctx.db.query("tools").collect();
    return {
      integrations,
      connections,
      tools,
    };
  },
});
