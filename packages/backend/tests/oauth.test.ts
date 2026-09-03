import { describe, expect, test } from "vitest";
import {
  buildAuthorizeUrl,
  parseTokenResponse,
  pkceChallenge,
  randomUrlToken,
} from "../convex/mcp/oauth";

describe("oauth helpers", () => {
  test("builds a PKCE authorize URL", async () => {
    const verifier = randomUrlToken();
    const challenge = await pkceChallenge(verifier);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    const url = buildAuthorizeUrl({
      authorizationEndpoint: "https://mcp.notion.com/authorize",
      clientId: "client-1",
      redirectUri: "https://example.convex.site/oauth/callback",
      state: "state-1",
      codeChallenge: challenge,
      scope: "default",
      resource: "https://mcp.notion.com/mcp",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("code_challenge")).toBe(challenge);
    expect(parsed.searchParams.get("resource")).toBe(
      "https://mcp.notion.com/mcp",
    );
  });

  test("parses token responses", () => {
    const tokens = parseTokenResponse({
      access_token: "tok",
      refresh_token: "ref",
      expires_in: 3600,
    });
    expect(tokens.accessToken).toBe("tok");
    expect(tokens.refreshToken).toBe("ref");
    expect(tokens.expiresAt).toBeGreaterThan(Date.now());
  });
});
