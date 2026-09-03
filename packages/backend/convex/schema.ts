import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const headerValidator = v.object({
  key: v.string(),
  value: v.string(),
});

export const policyValidator = v.union(v.literal("allow"), v.literal("block"));
export const keyRoleValidator = v.union(v.literal("admin"), v.literal("mcp"));
export const integrationKindValidator = v.union(
  v.literal("eva"),
  v.literal("mcp"),
);

const schema = defineSchema({
  apiKeys: defineTable({
    name: v.string(),
    keyHash: v.string(),
    prefix: v.string(),
    role: keyRoleValidator,
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_hash", ["keyHash"])
    .index("by_role", ["role"]),

  integrations: defineTable({
    name: v.string(),
    namespace: v.string(),
    kind: integrationKindValidator,
    createdAt: v.number(),
  }).index("by_namespace", ["namespace"]),

  connections: defineTable({
    integrationId: v.id("integrations"),
    name: v.string(),
    url: v.string(),
    headers: v.array(headerValidator),
    status: v.union(
      v.literal("pending"),
      v.literal("ready"),
      v.literal("error"),
    ),
    lastError: v.optional(v.string()),
    lastIndexedAt: v.optional(v.number()),
    clerkUserId: v.optional(v.string()),
    clerkApp: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_integration", ["integrationId"]),

  tools: defineTable({
    connectionId: v.id("connections"),
    integrationId: v.id("integrations"),
    name: v.string(),
    address: v.string(),
    description: v.optional(v.string()),
    inputSchema: v.optional(v.any()),
    policy: policyValidator,
    updatedAt: v.number(),
  })
    .index("by_connection", ["connectionId"])
    .index("by_address", ["address"])
    .index("by_integration", ["integrationId"]),

  executions: defineTable({
    connectionId: v.optional(v.id("connections")),
    toolAddress: v.string(),
    status: v.union(v.literal("ok"), v.literal("error"), v.literal("blocked")),
    error: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.number(),
  }).index("by_tool", ["toolAddress"]),
});

export default schema;
