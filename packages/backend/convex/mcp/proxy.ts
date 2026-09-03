export type Header = { key: string; value: string };

/** Convex documents cannot store field names that start with `$`. */
export function convexSafeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(convexSafeJson);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      const safeKey = key.startsWith("$") ? `_${key.slice(1)}` : key;
      out[safeKey] = convexSafeJson(nested);
    }
    return out;
  }
  return value;
}

export type UpstreamTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

export type RpcFn = (
  url: string,
  headers: Record<string, string>,
  message: unknown,
) => Promise<unknown>;

export function headersToRecord(headers: Header[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const header of headers) {
    if (header.key.trim()) record[header.key] = header.value;
  }
  return record;
}

export function parseSseJson(text: string): unknown {
  const blocks = text.split("\n\n");
  for (const block of blocks) {
    const dataLines = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());
    if (dataLines.length === 0) continue;
    const payload = dataLines.join("\n");
    if (!payload || payload === "[DONE]") continue;
    return JSON.parse(payload);
  }
  throw new Error("SSE response did not contain a JSON payload");
}

export function unwrapRpc(payload: unknown): unknown {
  if (payload === null || typeof payload !== "object") return payload;
  const record = payload as Record<string, unknown>;
  if (record.error && typeof record.error === "object") {
    const error = record.error as { message?: string };
    throw new Error(error.message ?? "Upstream MCP error");
  }
  if ("result" in record) return record.result;
  return payload;
}

export async function mcpJsonRpc(
  url: string,
  headers: Record<string, string>,
  message: unknown,
): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(message),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Upstream MCP ${response.status}: ${text.slice(0, 400) || response.statusText}`,
    );
  }
  if (!text) return null;
  if (text.startsWith("event:") || text.includes("\ndata:")) {
    return parseSseJson(text);
  }
  return JSON.parse(text);
}

export async function listUpstreamTools(
  url: string,
  headers: Header[],
  rpc: RpcFn = mcpJsonRpc,
): Promise<UpstreamTool[]> {
  const headerRecord = headersToRecord(headers);
  const listed = unwrapRpc(
    await rpc(url, headerRecord, {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    }),
  );
  const tools =
    listed && typeof listed === "object" && Array.isArray((listed as { tools?: unknown }).tools)
      ? ((listed as { tools: unknown[] }).tools ?? [])
      : [];
  return tools
    .filter((tool): tool is Record<string, unknown> => {
      return tool !== null && typeof tool === "object" && typeof (tool as { name?: unknown }).name === "string";
    })
    .map((tool) => ({
      name: tool.name as string,
      description:
        typeof tool.description === "string" ? tool.description : undefined,
      inputSchema: convexSafeJson(tool.inputSchema ?? tool.input_schema),
    }));
}

export async function callUpstreamTool(
  url: string,
  headers: Header[],
  name: string,
  args: unknown,
  rpc: RpcFn = mcpJsonRpc,
): Promise<unknown> {
  return unwrapRpc(
    await rpc(url, headersToRecord(headers), {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args ?? {} },
    }),
  );
}
