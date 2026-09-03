export type AuthorizationServer = {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint?: string;
};

export type OauthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type RegisteredClient = {
  clientId: string;
  clientSecret?: string;
};

const GOOGLE_AS: AuthorizationServer = {
  issuer: "https://accounts.google.com",
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

export function convexSiteUrl(): string {
  const site = process.env.CONVEX_SITE_URL;
  if (site) return site.replace(/\/$/, "");
  const cloud = process.env.CONVEX_CLOUD_URL;
  if (cloud) return cloud.replace(/\.convex\.cloud\/?$/, ".convex.site");
  throw new Error("CONVEX_SITE_URL is required");
}

export function oauthCallbackUrl(): string {
  return `${convexSiteUrl()}/oauth/callback`;
}

export function webAppUrl(): string {
  const url = process.env.WEB_APP_URL;
  if (url) return url.replace(/\/$/, "");
  return "http://127.0.0.1:5173";
}

export function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function randomUrlToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64Url(buf);
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64Url(new Uint8Array(digest));
}

export function buildAuthorizeUrl(input: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
  resource?: string;
  extra?: Record<string, string>;
}): string {
  const url = new URL(input.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (input.scope) url.searchParams.set("scope", input.scope);
  if (input.resource) url.searchParams.set("resource", input.resource);
  for (const [key, value] of Object.entries(input.extra ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  throw new Error("Expected a JSON object");
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export async function discoverAuthorizationServer(
  resourceUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthorizationServer> {
  const url = new URL(resourceUrl);
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  const prmCandidates = [
    `${url.origin}/.well-known/oauth-protected-resource${path}`,
    `${url.origin}/.well-known/oauth-protected-resource`,
  ];

  let issuer: string | undefined;
  for (const candidate of prmCandidates) {
    try {
      const res = await fetchImpl(candidate, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) continue;
      const body = asRecord(await res.json());
      issuer = firstString(body.authorization_servers);
      if (issuer) break;
    } catch {
      // try the next well-known URL
    }
  }

  if (!issuer) issuer = url.origin;
  const as = new URL(issuer);
  const asPath = as.pathname === "/" ? "" : as.pathname.replace(/\/$/, "");
  const asCandidates = [
    `${as.origin}/.well-known/oauth-authorization-server${asPath}`,
    `${as.origin}/.well-known/oauth-authorization-server`,
  ];

  for (const candidate of asCandidates) {
    try {
      const res = await fetchImpl(candidate, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) continue;
      const body = asRecord(await res.json());
      const authorizationEndpoint = firstString(body.authorization_endpoint);
      const tokenEndpoint = firstString(body.token_endpoint);
      if (!authorizationEndpoint || !tokenEndpoint) continue;
      return {
        issuer: firstString(body.issuer) ?? as.origin,
        authorizationEndpoint,
        tokenEndpoint,
        registrationEndpoint: firstString(body.registration_endpoint),
      };
    } catch {
      // try the next metadata URL
    }
  }

  throw new Error(`Could not discover an OAuth server for ${resourceUrl}`);
}

export function googleAuthorizationServer(): AuthorizationServer {
  return GOOGLE_AS;
}

export function slackAuthorizationServer(): AuthorizationServer {
  return {
    issuer: "https://mcp.slack.com",
    authorizationEndpoint: "https://slack.com/oauth/v2_user/authorize",
    tokenEndpoint: "https://slack.com/api/oauth.v2.user.access",
  };
}

export async function registerOauthClient(
  registrationEndpoint: string,
  input: { clientName: string; redirectUri: string },
  fetchImpl: typeof fetch = fetch,
): Promise<RegisteredClient> {
  const res = await fetchImpl(registrationEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      client_name: input.clientName,
      redirect_uris: [input.redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OAuth client registration failed: ${text.slice(0, 240)}`);
  }
  const body = asRecord(JSON.parse(text));
  const clientId = firstString(body.client_id);
  if (!clientId) throw new Error("OAuth registration did not return a client_id");
  return {
    clientId,
    clientSecret:
      typeof body.client_secret === "string" ? body.client_secret : undefined,
  };
}

export function parseTokenResponse(value: unknown): OauthTokens {
  const body = asRecord(value);
  const accessToken = firstString(body.access_token);
  if (!accessToken) throw new Error("Token response missing access_token");
  const expiresIn =
    typeof body.expires_in === "number" ? body.expires_in : undefined;
  return {
    accessToken,
    refreshToken:
      typeof body.refresh_token === "string" ? body.refresh_token : undefined,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
  };
}

export async function exchangeAuthorizationCode(
  tokenEndpoint: string,
  input: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret?: string;
    codeVerifier: string;
    resource?: string;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<OauthTokens> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    code_verifier: input.codeVerifier,
  });
  if (input.clientSecret) params.set("client_secret", input.clientSecret);
  if (input.resource) params.set("resource", input.resource);
  return postToken(tokenEndpoint, params, fetchImpl);
}

export async function refreshAccessToken(
  tokenEndpoint: string,
  input: {
    refreshToken: string;
    clientId?: string;
    clientSecret?: string;
    resource?: string;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<OauthTokens> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
  });
  if (input.clientId) params.set("client_id", input.clientId);
  if (input.clientSecret) params.set("client_secret", input.clientSecret);
  if (input.resource) params.set("resource", input.resource);
  const tokens = await postToken(tokenEndpoint, params, fetchImpl);
  return {
    ...tokens,
    refreshToken: tokens.refreshToken ?? input.refreshToken,
  };
}

async function postToken(
  tokenEndpoint: string,
  params: URLSearchParams,
  fetchImpl: typeof fetch,
): Promise<OauthTokens> {
  const res = await fetchImpl(tokenEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: params,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OAuth token request failed: ${text.slice(0, 240)}`);
  }
  return parseTokenResponse(JSON.parse(text));
}
