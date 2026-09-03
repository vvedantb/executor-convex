"use node";

import { createClerkClient } from "@clerk/backend";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function getClerkClient(clerkApp?: string) {
  if (clerkApp === "projectv") {
    return createClerkClient({
      secretKey: requiredEnv("PROJECTV_CLERK_SECRET_KEY"),
      publishableKey: requiredEnv("PROJECTV_CLERK_PUBLISHABLE_KEY"),
    });
  }
  return createClerkClient({
    secretKey: requiredEnv("CLERK_SECRET_KEY"),
    publishableKey: requiredEnv("CLERK_PUBLISHABLE_KEY"),
  });
}

export async function verifyClerkBearer(
  token: string,
): Promise<{ clerkUserId: string } | null> {
  for (const clerkApp of [undefined, "projectv"]) {
    try {
      const clerk = getClerkClient(clerkApp);
      const request = new Request("https://mcp.local/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const state = await clerk.authenticateRequest(request, {
        acceptsToken: ["oauth_token", "session_token"],
      });
      if (!state.isAuthenticated) continue;
      const auth = state.toAuth();
      if (!auth.isAuthenticated) continue;
      if (
        auth.tokenType !== "oauth_token" &&
        auth.tokenType !== "session_token"
      ) {
        continue;
      }
      if (typeof auth.userId !== "string" || auth.userId.length === 0) {
        continue;
      }
      return { clerkUserId: auth.userId };
    } catch {
      // try the next Clerk app
    }
  }
  return null;
}

export async function headersForConnection(connection: {
  headers: Array<{ key: string; value: string }>;
  clerkUserId?: string;
  clerkApp?: string;
}): Promise<Array<{ key: string; value: string }>> {
  if (!connection.clerkUserId) return connection.headers;
  const token = await mintClerkSessionToken(
    connection.clerkUserId,
    connection.clerkApp,
  );
  const headers = connection.headers.filter(
    (header) => header.key.toLowerCase() !== "authorization",
  );
  return [{ key: "Authorization", value: `Bearer ${token}` }, ...headers];
}

function tokenFromMinted(minted: unknown): string {
  if (typeof minted === "string" && minted.length > 0) return minted;
  if (minted && typeof minted === "object" && "jwt" in minted) {
    const jwt = (minted as { jwt?: unknown }).jwt;
    if (typeof jwt === "string" && jwt.length > 0) return jwt;
  }
  throw new Error("Clerk did not return a session token");
}

function isDevOnlySessionCreate(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const errors = (error as { errors?: Array<{ code?: string }> }).errors;
  return Boolean(
    errors?.some((item) => item.code === "request_invalid_for_environment"),
  );
}

export async function mintClerkSessionToken(
  clerkUserId: string,
  clerkApp?: string,
): Promise<string> {
  const clerk = getClerkClient(clerkApp);
  try {
    const session = await clerk.sessions.createSession({ userId: clerkUserId });
    return tokenFromMinted(await clerk.sessions.getToken(session.id));
  } catch (error) {
    if (!isDevOnlySessionCreate(error)) throw error;
  }

  const listed = await clerk.sessions.getSessionList({
    userId: clerkUserId,
    status: "active",
  });
  const sessions = listed.data ?? [];
  if (sessions.length === 0) {
    throw new Error(
      "No active Clerk session for this user. Sign in to that app, then retry.",
    );
  }
  const newest = [...sessions].sort(
    (a, b) => (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0),
  )[0];
  return tokenFromMinted(await clerk.sessions.getToken(newest.id));
}
