import { describe, expect, test } from "vitest";
import { handleGateway, indexConnection } from "../convex/mcp/gateway";
import { initializeResult } from "../convex/mcp/protocol";
import { startMockEva } from "./mockEva";

describe("MCP gateway", () => {
  test("initialize and ping", async () => {
    const init = await handleGateway(
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
      { tools: [], connections: [] },
    );
    expect(init.status).toBe(200);
    expect(init.body?.result).toEqual(initializeResult());

    const ping = await handleGateway(
      { jsonrpc: "2.0", id: 2, method: "ping" },
      { tools: [], connections: [] },
    );
    expect(ping.body?.result).toEqual({});
  });

  test("notifications return 202", async () => {
    const result = await handleGateway(
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { tools: [], connections: [] },
    );
    expect(result.status).toBe(202);
    expect(result.body).toBeNull();
  });

  test("end to end: index Eva, list namespaced tools, proxy a call, honor block", async () => {
    const eva = await startMockEva();
    try {
      const indexed = await indexConnection(eva.url, [
        { key: "Authorization", value: `Bearer ${eva.token}` },
      ]);
      expect(indexed.map((tool) => tool.name)).toEqual([
        "list_repositories",
        "create_task",
      ]);

      const catalog = {
        connections: [
          {
            id: "conn_eva",
            url: eva.url,
            headers: [{ key: "Authorization", value: `Bearer ${eva.token}` }],
          },
        ],
        tools: indexed.map((tool) => ({
          name: tool.name,
          address: `eva__${tool.name}`,
          description: tool.description,
          inputSchema: tool.inputSchema,
          policy: tool.name === "create_task" ? ("block" as const) : ("allow" as const),
          connectionId: "conn_eva",
        })),
      };

      const listed = await handleGateway(
        { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} },
        catalog,
      );
      const tools = (listed.body?.result as { tools: Array<{ name: string }> }).tools;
      expect(tools.map((tool) => tool.name)).toEqual(["eva__list_repositories"]);

      const called = await handleGateway(
        {
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: { name: "eva__list_repositories", arguments: {} },
        },
        catalog,
      );
      expect(called.body?.error).toBeUndefined();
      expect(JSON.stringify(called.body?.result)).toContain("eva");
      expect(eva.calls.some((call) => call.name === "list_repositories")).toBe(true);

      const blocked = await handleGateway(
        {
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: {
            name: "eva__create_task",
            arguments: { title: "should not run" },
          },
        },
        catalog,
      );
      expect(blocked.body?.error?.message).toMatch(/blocked/i);
      expect(eva.calls.some((call) => call.name === "create_task")).toBe(false);
    } finally {
      await eva.close();
    }
  });

  test("rejects a bad Eva bearer token while indexing", async () => {
    const eva = await startMockEva();
    try {
      await expect(
        indexConnection(eva.url, [
          { key: "Authorization", value: "Bearer wrong" },
        ]),
      ).rejects.toThrow(/401/);
    } finally {
      await eva.close();
    }
  });
});
