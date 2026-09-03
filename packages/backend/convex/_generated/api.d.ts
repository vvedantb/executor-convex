/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as auth from "../auth.js";
import type * as catalog from "../catalog.js";
import type * as crypto from "../crypto.js";
import type * as http from "../http.js";
import type * as internalCatalog from "../internalCatalog.js";
import type * as mcp_gateway from "../mcp/gateway.js";
import type * as mcp_native from "../mcp/native.js";
import type * as mcp_nodeActions from "../mcp/nodeActions.js";
import type * as mcp_protocol from "../mcp/protocol.js";
import type * as mcp_proxy from "../mcp/proxy.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  auth: typeof auth;
  catalog: typeof catalog;
  crypto: typeof crypto;
  http: typeof http;
  internalCatalog: typeof internalCatalog;
  "mcp/gateway": typeof mcp_gateway;
  "mcp/native": typeof mcp_native;
  "mcp/nodeActions": typeof mcp_nodeActions;
  "mcp/protocol": typeof mcp_protocol;
  "mcp/proxy": typeof mcp_proxy;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
