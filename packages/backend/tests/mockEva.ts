import { createServer, type IncomingMessage, type Server } from "node:http";

export type MockEvaCall = {
  method: string;
  name?: string;
  arguments?: unknown;
};

export async function startMockEva(options?: {
  token?: string;
  tools?: Array<{ name: string; description?: string; inputSchema?: unknown }>;
}): Promise<{
  url: string;
  token: string;
  calls: MockEvaCall[];
  close: () => Promise<void>;
}> {
  const token = options?.token ?? "eva-test-token";
  const tools = options?.tools ?? [
    {
      name: "list_repositories",
      description: "List repositories the caller can see in Eva",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "create_task",
      description: "Create an Eva task",
      inputSchema: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
      },
    },
  ];
  const calls: MockEvaCall[] = [];

  const server: Server = createServer(async (req: IncomingMessage, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
      });
      res.end();
      return;
    }
    if (req.url !== "/mcp" || req.method !== "POST") {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${token}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
      jsonrpc: "2.0";
      id: number;
      method: string;
      params?: { name?: string; arguments?: unknown };
    };
    calls.push({
      method: body.method,
      name: body.params?.name,
      arguments: body.params?.arguments,
    });

    let result: unknown = {};
    if (body.method === "initialize") {
      result = {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "eva-mcp", version: "test" },
      };
    } else if (body.method === "tools/list") {
      result = { tools };
    } else if (body.method === "tools/call") {
      if (body.params?.name === "list_repositories") {
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify([{ owner: "vedant", name: "eva" }]),
            },
          ],
        };
      } else if (body.params?.name === "create_task") {
        result = {
          content: [
            {
              type: "text",
              text: `created:${(body.params.arguments as { title?: string })?.title ?? ""}`,
            },
          ],
        };
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            error: { code: -32601, message: `Unknown Eva tool ${body.params?.name}` },
          }),
        );
        return;
      }
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("mock Eva failed to bind");
  }
  return {
    url: `http://127.0.0.1:${address.port}/mcp`,
    token,
    calls,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
