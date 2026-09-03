import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { handleGateway } from "../convex/mcp/gateway";
import { startMockEva } from "./mockEva";

const modules = import.meta.glob("../convex/**/*.ts");

describe("executor-convex e2e", () => {
  test("add Eva, index it, serve namespaced tools on the Executor MCP plane", async () => {
    const eva = await startMockEva();
    const t = convexTest(schema, modules);
    try {
      const keys = await t.mutation(api.auth.setup, {});
      const created = await t.mutation(api.catalog.createIntegration, {
        apiKey: keys.adminKey,
        name: "Eva",
        namespace: "eva",
        kind: "eva",
        url: eva.url,
        bearerToken: eva.token,
      });

      const connection = await t.run(async (ctx) => ctx.db.get(created.connectionId));
      if (!connection) throw new Error("missing connection");

      const { indexConnection } = await import("../convex/mcp/gateway");
      const indexed = await indexConnection(connection.url, connection.headers);
      await t.run(async (ctx) => {
        const now = Date.now();
        for (const tool of indexed) {
          await ctx.db.insert("tools", {
            connectionId: created.connectionId,
            integrationId: created.integrationId,
            name: tool.name,
            address: `eva__${tool.name}`,
            description: tool.description,
            inputSchema: tool.inputSchema,
            policy: "allow",
            updatedAt: now,
          });
        }
        await ctx.db.patch(created.connectionId, {
          status: "ready",
          lastIndexedAt: now,
        });
      });

      const detail = await t.query(api.catalog.getIntegration, {
        apiKey: keys.adminKey,
        integrationId: created.integrationId,
      });
      expect(detail?.tools.map((tool) => tool.address)).toContain(
        "eva__list_repositories",
      );

      const catalog = await t.run(async (ctx) => {
        const tools = await ctx.db.query("tools").collect();
        const connections = await ctx.db.query("connections").collect();
        return {
          tools: tools.map((tool) => ({
            name: tool.name,
            address: tool.address,
            description: tool.description,
            inputSchema: tool.inputSchema,
            policy: tool.policy,
            connectionId: tool.connectionId,
          })),
          connections: connections.map((item) => ({
            id: item._id,
            url: item.url,
            headers: item.headers,
          })),
        };
      });

      const listed = await handleGateway(
        { jsonrpc: "2.0", id: "list", method: "tools/list", params: {} },
        catalog,
      );
      const names = (
        listed.body?.result as { tools: Array<{ name: string }> }
      ).tools.map((tool) => tool.name);
      expect(names).toContain("eva__list_repositories");
      expect(names).toContain("eva__create_task");

      const called = await handleGateway(
        {
          jsonrpc: "2.0",
          id: "call",
          method: "tools/call",
          params: { name: "eva__list_repositories", arguments: {} },
        },
        catalog,
      );
      expect(called.body?.error).toBeUndefined();
      expect(JSON.stringify(called.body?.result)).toContain("vedant");
      expect(eva.calls.some((call) => call.method === "tools/call")).toBe(true);
    } finally {
      await eva.close();
    }
  });
});
