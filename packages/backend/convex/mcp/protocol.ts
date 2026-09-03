export const PROTOCOL_VERSION = "2025-03-26";
export const SERVER_NAME = "executor-convex";
export const SERVER_VERSION = "0.1.0";

export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

export type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcError;
};

export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.jsonrpc === "2.0" && typeof record.method === "string";
}

export function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export function fail(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

export function toolAddress(namespace: string, name: string): string {
  return `${namespace}__${name}`;
}

export function parseToolAddress(
  address: string,
): { namespace: string; name: string } | null {
  const index = address.indexOf("__");
  if (index <= 0) return null;
  return {
    namespace: address.slice(0, index),
    name: address.slice(index + 2),
  };
}

export function initializeResult() {
  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      tools: { listChanged: false },
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    instructions:
      "Executor is a shared MCP catalog hosted on Convex. Upstream tools are namespaced as namespace__tool. Add Eva or any streamable-HTTP MCP server in the console, then call those tools from any client pointed at this /mcp endpoint.",
  };
}
