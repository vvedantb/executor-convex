import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const saveState = internalMutation({
  args: {
    state: v.string(),
    codeVerifier: v.string(),
    connectionId: v.id("connections"),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("oauthStates", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const consumeState = internalMutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();
    if (!row) return null;
    await ctx.db.delete(row._id);
    if (row.expiresAt < Date.now()) return null;
    return {
      codeVerifier: row.codeVerifier,
      connectionId: row.connectionId,
    };
  },
});

export const getConnection = internalQuery({
  args: { connectionId: v.id("connections") },
  handler: async (ctx, args) => ctx.db.get(args.connectionId),
});

export const saveClient = internalMutation({
  args: {
    connectionId: v.id("connections"),
    oauthClientId: v.string(),
    oauthClientSecret: v.optional(v.string()),
    tokenEndpoint: v.string(),
    authorizationEndpoint: v.string(),
    oauthScopes: v.optional(v.string()),
    oauthResource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { connectionId, ...fields } = args;
    await ctx.db.patch(connectionId, {
      ...fields,
      authKind: "oauth",
      clerkUserId: undefined,
    });
  },
});

export const saveTokens = internalMutation({
  args: {
    connectionId: v.id("connections"),
    oauthAccessToken: v.string(),
    oauthRefreshToken: v.optional(v.string()),
    oauthExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) throw new Error("Connection not found");
    await ctx.db.patch(args.connectionId, {
      authKind: "oauth",
      oauthAccessToken: args.oauthAccessToken,
      oauthRefreshToken: args.oauthRefreshToken ?? connection.oauthRefreshToken,
      oauthExpiresAt: args.oauthExpiresAt,
      lastError: undefined,
    });
  },
});
