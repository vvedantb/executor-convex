import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { formatApiKey, keyPrefix, randomToken, sha256Hex } from "./crypto";

export async function requireKey(
  ctx: QueryCtx | MutationCtx,
  apiKey: string,
  role?: "admin" | "mcp",
) {
  const keyHash = await sha256Hex(apiKey);
  const record = await ctx.db
    .query("apiKeys")
    .withIndex("by_hash", (q) => q.eq("keyHash", keyHash))
    .unique();
  if (!record || record.revokedAt) {
    throw new Error("Invalid API key");
  }
  if (role === "admin" && record.role !== "admin") {
    throw new Error("Admin API key required");
  }
  return record;
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  apiKey?: string,
) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity?.subject) {
    return {
      kind: "clerk" as const,
      clerkUserId: identity.subject,
      role: "admin" as const,
    };
  }
  if (!apiKey) {
    throw new Error("Admin API key required");
  }
  const record = await requireKey(ctx, apiKey, "admin");
  return { kind: "key" as const, ...record };
}

export const status = query({
  args: {},
  handler: async (ctx) => {
    const keys = await ctx.db.query("apiKeys").take(1);
    return { setupComplete: keys.length > 0 };
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return null;
    return { clerkUserId: identity.subject };
  },
});

export const validate = query({
  args: { apiKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity?.subject) {
      return { ok: true as const, role: "admin" as const, name: "Clerk" };
    }
    if (!args.apiKey) return { ok: false as const };
    try {
      const record = await requireKey(ctx, args.apiKey, "admin");
      return { ok: true as const, role: record.role, name: record.name };
    } catch {
      return { ok: false as const };
    }
  },
});

export const setup = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("apiKeys").take(1);
    if (existing.length > 0) {
      throw new Error("This instance is already set up");
    }
    const now = Date.now();
    const adminSecret = randomToken();
    const mcpSecret = randomToken();
    const adminKey = formatApiKey("admin", adminSecret);
    const mcpKey = formatApiKey("mcp", mcpSecret);
    await ctx.db.insert("apiKeys", {
      name: "Owner",
      keyHash: await sha256Hex(adminKey),
      prefix: keyPrefix(adminKey),
      role: "admin",
      createdAt: now,
    });
    await ctx.db.insert("apiKeys", {
      name: "Default MCP",
      keyHash: await sha256Hex(mcpKey),
      prefix: keyPrefix(mcpKey),
      role: "mcp",
      createdAt: now,
    });
    return {
      adminKey,
      mcpKey,
    };
  },
});

export const createKey = mutation({
  args: {
    apiKey: v.optional(v.string()),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("mcp")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.apiKey);
    const secret = randomToken();
    const key = formatApiKey(args.role, secret);
    const id = await ctx.db.insert("apiKeys", {
      name: args.name.trim() || "Untitled key",
      keyHash: await sha256Hex(key),
      prefix: keyPrefix(key),
      role: args.role,
      createdAt: Date.now(),
    });
    return { id, key };
  },
});

export const listKeys = query({
  args: { apiKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.apiKey);
    const keys = await ctx.db.query("apiKeys").collect();
    return keys
      .filter((key) => !key.revokedAt)
      .map((key) => ({
        _id: key._id,
        name: key.name,
        prefix: key.prefix,
        role: key.role,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
      }));
  },
});

export const revokeKey = mutation({
  args: { apiKey: v.optional(v.string()), keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, args.apiKey);
    if (actor.kind === "key" && actor._id === args.keyId) {
      throw new Error("Cannot revoke the key you are using");
    }
    const target = await ctx.db.get(args.keyId);
    if (!target) throw new Error("Key not found");
    await ctx.db.patch(args.keyId, { revokedAt: Date.now() });
  },
});
