import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");

describe("catalog + keys", () => {
  test("setup, add Eva, persist tools, apply policy", async () => {
    const t = convexTest(schema, modules);
    const empty = await t.query(api.auth.status, {});
    expect(empty.setupComplete).toBe(false);

    const keys = await t.mutation(api.auth.setup, {});
    expect(keys.adminKey.startsWith("exc_admin_")).toBe(true);
    expect(keys.mcpKey.startsWith("exc_mcp_")).toBe(true);
    expect((await t.query(api.auth.status, {})).setupComplete).toBe(true);

    const created = await t.mutation(api.catalog.createIntegration, {
      apiKey: keys.adminKey,
      name: "Eva",
      namespace: "eva",
      kind: "eva",
      url: "https://example.convex.site/mcp",
      bearerToken: "eva-oauth-token",
    });

    const listed = await t.query(api.catalog.listIntegrations, {
      apiKey: keys.adminKey,
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.namespace).toBe("eva");
    expect(listed[0]?.kind).toBe("eva");
    expect(listed[0]?.connectionCount).toBe(1);

    await t.run(async (ctx) => {
      await ctx.db.insert("tools", {
        connectionId: created.connectionId,
        integrationId: created.integrationId,
        name: "list_repositories",
        address: "eva__list_repositories",
        description: "List repos",
        policy: "allow",
        updatedAt: Date.now(),
      });
    });

    const detail = await t.query(api.catalog.getIntegration, {
      apiKey: keys.adminKey,
      integrationId: created.integrationId,
    });
    expect(detail?.connections[0]?.hasAuth).toBe(true);
    expect(detail?.connections[0]?.url).toContain("convex.site/mcp");
    expect(detail?.tools[0]?.address).toBe("eva__list_repositories");

    await t.mutation(api.catalog.setToolPolicy, {
      apiKey: keys.adminKey,
      toolId: detail!.tools[0]!._id,
      policy: "block",
    });
    const after = await t.query(api.catalog.getIntegration, {
      apiKey: keys.adminKey,
      integrationId: created.integrationId,
    });
    expect(after?.tools[0]?.policy).toBe("block");

    await expect(
      t.query(api.catalog.listIntegrations, { apiKey: keys.mcpKey }),
    ).rejects.toThrow(/Admin/);
  });

  test("rejects a duplicate namespace", async () => {
    const t = convexTest(schema, modules);
    const keys = await t.mutation(api.auth.setup, {});
    await t.mutation(api.catalog.createIntegration, {
      apiKey: keys.adminKey,
      name: "Eva",
      namespace: "eva",
      kind: "eva",
      url: "https://a.convex.site/mcp",
      bearerToken: "one",
    });
    await expect(
      t.mutation(api.catalog.createIntegration, {
        apiKey: keys.adminKey,
        name: "Eva 2",
        namespace: "eva",
        kind: "eva",
        url: "https://b.convex.site/mcp",
        bearerToken: "two",
      }),
    ).rejects.toThrow(/already in use/);
  });
});
