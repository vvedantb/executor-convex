"use node";

import { v } from "convex/values";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { googleOAuthConfigured, presetBySlug, slackOAuthConfigured } from "./presets";
import { indexConnection } from "./mcp/gateway";
import {
  buildAuthorizeUrl,
  discoverAuthorizationServer,
  exchangeAuthorizationCode,
  googleAuthorizationServer,
  oauthCallbackUrl,
  slackAuthorizationServer,
  pkceChallenge,
  randomUrlToken,
  registerOauthClient,
} from "./mcp/oauth";

async function requireAdmin(
  ctx: {
    auth: { getUserIdentity: () => Promise<{ subject?: string } | null> };
    runQuery: (
      fn: typeof internal.internalCatalog.lookupKey,
      args: { apiKey: string },
    ) => Promise<{ role: string } | null>;
  },
  apiKey?: string,
) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity?.subject) return;
  if (!apiKey) throw new Error("Admin API key required");
  const key = await ctx.runQuery(internal.internalCatalog.lookupKey, { apiKey });
  if (!key || key.role !== "admin") throw new Error("Admin API key required");
}

async function authorizeUrlForConnection(
  ctx: ActionCtx,
  connectionId: Id<"connections">,
  scopes?: string[],
  provider?: "google" | "slack",
): Promise<string> {
  const connection = (await ctx.runQuery(internal.internalOauth.getConnection, {
    connectionId,
  })) as Doc<"connections"> | null;
  if (!connection) throw new Error("Connection not found");

  const redirectUri = oauthCallbackUrl();
  const resource = connection.url;
  const as =
    provider === "google"
      ? googleAuthorizationServer()
      : provider === "slack"
        ? slackAuthorizationServer()
        : await discoverAuthorizationServer(connection.url);

  let clientId = connection.oauthClientId;
  let clientSecret = connection.oauthClientSecret;
  if (provider === "google") {
    clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error(
        "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET on the Convex deployment",
      );
    }
  } else if (provider === "slack") {
    clientId = process.env.SLACK_OAUTH_CLIENT_ID;
    clientSecret = process.env.SLACK_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error(
        "Set SLACK_OAUTH_CLIENT_ID and SLACK_OAUTH_CLIENT_SECRET on the Convex deployment",
      );
    }
  } else if (!clientId) {
    if (!as.registrationEndpoint) {
      throw new Error(
        "This MCP server does not advertise dynamic client registration. Paste a bearer token instead.",
      );
    }
    const registered = await registerOauthClient(as.registrationEndpoint, {
      clientName: "Executor",
      redirectUri,
    });
    clientId = registered.clientId;
    clientSecret = registered.clientSecret;
  }

  const scope = scopes?.join(" ") || connection.oauthScopes;
  await ctx.runMutation(internal.internalOauth.saveClient, {
    connectionId,
    oauthClientId: clientId,
    oauthClientSecret: clientSecret,
    tokenEndpoint: as.tokenEndpoint,
    authorizationEndpoint: as.authorizationEndpoint,
    oauthScopes: scope,
    oauthResource: resource,
  });

  const state = randomUrlToken();
  const codeVerifier = randomUrlToken();
  const codeChallenge = await pkceChallenge(codeVerifier);
  await ctx.runMutation(internal.internalOauth.saveState, {
    state,
    codeVerifier,
    connectionId,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return buildAuthorizeUrl({
    authorizationEndpoint: as.authorizationEndpoint,
    clientId,
    redirectUri,
    state,
    codeChallenge,
    scope,
    resource: provider ? undefined : resource,
    extra:
      provider === "google"
        ? { access_type: "offline", prompt: "consent", include_granted_scopes: "true" }
        : undefined,
  });
}

export const connectPreset = action({
  args: {
    apiKey: v.optional(v.string()),
    slug: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    integrationId: Id<"integrations">;
    connectionId: Id<"connections">;
    authorizeUrl: string | null;
  }> => {
    await requireAdmin(ctx, args.apiKey);
    const preset = presetBySlug(args.slug);
    if (preset.auth === "google" && !googleOAuthConfigured()) {
      throw new Error(
        "Add a Google Cloud OAuth web client, then set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET",
      );
    }
    if (preset.auth === "slack" && !slackOAuthConfigured()) {
      throw new Error(
        "Add a Slack OAuth app, then set SLACK_OAUTH_CLIENT_ID and SLACK_OAUTH_CLIENT_SECRET",
      );
    }

    const created = await ctx.runMutation(api.catalog.createFromPreset, {
      apiKey: args.apiKey,
      slug: args.slug,
    });

    if (preset.auth === "bearer") {
      return { ...created, authorizeUrl: null };
    }

    const authorizeUrl = await authorizeUrlForConnection(
      ctx,
      created.connectionId,
      preset.scopes,
      preset.auth === "google" || preset.auth === "slack"
        ? preset.auth
        : undefined,
    );
    return { ...created, authorizeUrl };
  },
});

export const startOauth = action({
  args: {
    apiKey: v.optional(v.string()),
    connectionId: v.id("connections"),
  },
  handler: async (ctx, args): Promise<{ authorizeUrl: string }> => {
    await requireAdmin(ctx, args.apiKey);
    const connection = await ctx.runQuery(internal.internalOauth.getConnection, {
      connectionId: args.connectionId,
    });
    if (!connection) throw new Error("Connection not found");
    const provider = connection.authorizationEndpoint?.includes(
      "accounts.google.com",
    )
      ? "google"
      : connection.authorizationEndpoint?.includes("slack.com")
        ? "slack"
        : undefined;
    const authorizeUrl = await authorizeUrlForConnection(
      ctx,
      args.connectionId,
      connection.oauthScopes ? connection.oauthScopes.split(" ") : undefined,
      provider,
    );
    return { authorizeUrl };
  },
});

export const finishOauth = internalAction({
  args: {
    code: v.string(),
    state: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ integrationId: string; error?: string }> => {
    const consumed = await ctx.runMutation(internal.internalOauth.consumeState, {
      state: args.state,
    });
    if (!consumed) throw new Error("OAuth state is invalid or expired");
    const connection = await ctx.runQuery(internal.internalOauth.getConnection, {
      connectionId: consumed.connectionId,
    });
    if (!connection?.oauthClientId || !connection.tokenEndpoint) {
      throw new Error("OAuth client is not configured on this connection");
    }

    const hosted =
      connection.authorizationEndpoint?.includes("accounts.google.com") ||
      connection.authorizationEndpoint?.includes("slack.com");
    const tokens = await exchangeAuthorizationCode(connection.tokenEndpoint, {
      code: args.code,
      redirectUri: oauthCallbackUrl(),
      clientId: connection.oauthClientId,
      clientSecret: connection.oauthClientSecret,
      codeVerifier: consumed.codeVerifier,
      resource: hosted ? undefined : connection.oauthResource,
    });
    await ctx.runMutation(internal.internalOauth.saveTokens, {
      connectionId: consumed.connectionId,
      oauthAccessToken: tokens.accessToken,
      oauthRefreshToken: tokens.refreshToken,
      oauthExpiresAt: tokens.expiresAt,
    });

    try {
      const tools = await indexConnection(connection.url, [
        { key: "Authorization", value: `Bearer ${tokens.accessToken}` },
      ]);
      await ctx.runMutation(internal.internalCatalog.replaceConnectionTools, {
        connectionId: consumed.connectionId,
        tools,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.internalCatalog.replaceConnectionTools, {
        connectionId: consumed.connectionId,
        tools: [],
        error: message,
      });
      return { integrationId: connection.integrationId, error: message };
    }

    return { integrationId: connection.integrationId };
  },
});
