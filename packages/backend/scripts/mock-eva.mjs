import { createServer } from "node:http";

const token = process.env.EVA_TOKEN ?? "eva-test-token";
const port = Number(process.env.PORT ?? 8787);

const tools = [
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

const server = createServer(async (req, res) => {
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
  if (req.headers.authorization !== `Bearer ${token}`) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  let result = {};
  if (body.method === "initialize") {
    result = {
      protocolVersion: "2025-03-26",
      capabilities: { tools: {} },
      serverInfo: { name: "eva-mcp", version: "local" },
    };
  } else if (body.method === "tools/list") {
    result = { tools };
  } else if (body.method === "tools/call" && body.params?.name === "list_repositories") {
    result = {
      content: [
        { type: "text", text: JSON.stringify([{ owner: "vedant", name: "eva" }]) },
      ],
    };
  } else if (body.method === "tools/call" && body.params?.name === "create_task") {
    result = {
      content: [
        {
          type: "text",
          text: `created:${body.params.arguments?.title ?? ""}`,
        },
      ],
    };
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", id: body.id ?? 1, result }));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`MOCK_EVA_READY http://127.0.0.1:${port}/mcp token=${token}`);
});
