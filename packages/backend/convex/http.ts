import { httpRouter } from "convex/server";
import {
  health,
  mcpHandler,
  oauthMetadata,
  optionsHandler,
  protectedResourceMetadata,
} from "./mcp/native";

const http = httpRouter();

http.route({
  path: "/.well-known/oauth-authorization-server",
  method: "GET",
  handler: oauthMetadata,
});

http.route({
  path: "/.well-known/oauth-protected-resource",
  method: "GET",
  handler: protectedResourceMetadata,
});

http.route({ path: "/mcp", method: "OPTIONS", handler: optionsHandler });
http.route({ path: "/mcp", method: "GET", handler: mcpHandler });
http.route({ path: "/mcp", method: "POST", handler: mcpHandler });
http.route({ path: "/mcp", method: "DELETE", handler: mcpHandler });

http.route({ path: "/health", method: "GET", handler: health });

export default http;
