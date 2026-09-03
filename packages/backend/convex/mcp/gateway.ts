import {
  fail,
  initializeResult,
  isJsonRpcRequest,
  ok,
  parseToolAddress,
  type JsonRpcId,
  type JsonRpcResponse,
} from "./protocol";
import {
  callUpstreamTool,
  listUpstreamTools,
  type Header,
  type RpcFn,
  type UpstreamTool,
} from "./proxy";

export type CatalogTool = {
  name: string;
  address: string;
  description?: string;
  inputSchema?: unknown;
  policy: "allow" | "block";
  connectionId: string;
};

export type CatalogConnection = {
  id: string;
  url: string;
  headers: Header[];
};

export type GatewayCatalog = {
  tools: CatalogTool[];
  connections: CatalogConnection[];
};

export type GatewayResult = {
  status: number;
  body: JsonRpcResponse | null;
};

export type GatewayHooks = {
  rpc?: RpcFn;
  onExecution?: (event: {
    connectionId?: string;
    toolAddress: string;
    status: "ok" | "error" | "blocked";
    error?: string;
    startedAt: number;
    finishedAt: number;
  }) => Promise<void> | void;
};

function idOf(request: { id?: JsonRpcId }): JsonRpcId {
  return request.id === undefined ? null : request.id;
}

function toolsList(catalog: GatewayCatalog) {
  return {
    tools: catalog.tools
      .filter((tool) => tool.policy !== "block")
      .map((tool) => ({
        name: tool.address,
        description: tool.description ?? "",
        inputSchema:
          tool.inputSchema && typeof tool.inputSchema === "object"
            ? tool.inputSchema
            : { type: "object", properties: {} },
      })),
  };
}

export async function handleGateway(
  body: unknown,
  catalog: GatewayCatalog,
  hooks: GatewayHooks = {},
): Promise<GatewayResult> {
  if (!isJsonRpcRequest(body)) {
    return {
      status: 400,
      body: fail(null, -32600, "Invalid JSON-RPC request"),
    };
  }
  const id = idOf(body);
  if (body.id === undefined && body.method.startsWith("notifications/")) {
    return { status: 202, body: null };
  }

  switch (body.method) {
    case "initialize":
      return { status: 200, body: ok(id, initializeResult()) };
    case "ping":
      return { status: 200, body: ok(id, {}) };
    case "tools/list":
      return { status: 200, body: ok(id, toolsList(catalog)) };
    case "tools/call": {
      const params = (body.params ?? {}) as {
        name?: string;
        arguments?: unknown;
      };
      const address = params.name ?? "";
      const tool = catalog.tools.find((entry) => entry.address === address);
      const startedAt = Date.now();
      if (!tool) {
        return {
          status: 200,
          body: fail(id, -32601, `Unknown tool: ${address}`),
        };
      }
      if (tool.policy === "block") {
        await hooks.onExecution?.({
          connectionId: tool.connectionId,
          toolAddress: address,
          status: "blocked",
          error: "Blocked by Executor policy",
          startedAt,
          finishedAt: Date.now(),
        });
        return {
          status: 200,
          body: fail(id, -32000, `${address} is blocked by Executor policy`),
        };
      }
      const connection = catalog.connections.find(
        (entry) => entry.id === tool.connectionId,
      );
      if (!connection) {
        return {
          status: 200,
          body: fail(id, -32000, "Connection for this tool is missing"),
        };
      }
      const parsed = parseToolAddress(address);
      const upstreamName = parsed?.name ?? tool.name;
      try {
        const result = await callUpstreamTool(
          connection.url,
          connection.headers,
          upstreamName,
          params.arguments,
          hooks.rpc,
        );
        await hooks.onExecution?.({
          connectionId: connection.id,
          toolAddress: address,
          status: "ok",
          startedAt,
          finishedAt: Date.now(),
        });
        return { status: 200, body: ok(id, result) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await hooks.onExecution?.({
          connectionId: connection.id,
          toolAddress: address,
          status: "error",
          error: message,
          startedAt,
          finishedAt: Date.now(),
        });
        return { status: 200, body: fail(id, -32000, message) };
      }
    }
    default:
      return {
        status: 200,
        body: fail(id, -32601, `Method not found: ${body.method}`),
      };
  }
}

export async function indexConnection(
  url: string,
  headers: Header[],
  rpc?: RpcFn,
): Promise<UpstreamTool[]> {
  return listUpstreamTools(url, headers, rpc);
}
