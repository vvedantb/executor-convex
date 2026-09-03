import { convexSiteUrl } from "./convex";

export function mcpUrl(): string {
  return `${convexSiteUrl()}/mcp`;
}

export function cursorConfig(apiKey: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        executor: {
          url: mcpUrl(),
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      },
    },
    null,
    2,
  );
}

export function addMcpCommand(apiKey: string): string {
  return `npx add-mcp ${mcpUrl()} --transport http --name executor --header "Authorization: Bearer ${apiKey}"`;
}
