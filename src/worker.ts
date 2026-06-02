/**
 * Cloudflare Workers entry point for the Hudu MCP Server.
 *
 * Serves the full Hudu MCP server over the Streamable HTTP transport using the
 * SDK's Web Standard transport (Request/Response), which runs natively on
 * Workers. It reuses the same `HuduService` + tool/resource handlers as the
 * stdio / Node HTTP entrypoint via the side-effect-free `createWorkerMcpServer`
 * factory, so there is no second tool implementation to maintain.
 *
 * Credentials are resolved per request, in order:
 * 1. Gateway headers (when AUTH_MODE=gateway):
 *    - X-Hudu-Base-URL
 *    - X-Hudu-API-Key
 * 2. Worker secrets / vars (env mode):
 *    - HUDU_BASE_URL
 *    - HUDU_API_KEY
 *
 * `tools/list`, `resources/list` and `initialize` work without credentials;
 * only `tools/call` (and resource reads) require them.
 *
 * The Hudu SDK (`@wyre-technology/node-hudu`) uses the global `fetch` API, so
 * it runs natively on the Workers runtime with `nodejs_compat`.
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createWorkerMcpServer } from './mcp/worker-server.js';
import { createWorkerLogger } from './utils/worker-logger.js';
import { McpServerConfig } from './types/mcp.js';
import { LogLevel } from './utils/logger.js';

export interface Env {
  HUDU_BASE_URL?: string;
  HUDU_API_KEY?: string;
  AUTH_MODE?: string;
  LOG_LEVEL?: string;
  MCP_SERVER_NAME?: string;
  MCP_SERVER_VERSION?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, X-Hudu-Base-URL, X-Hudu-API-Key',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Shallow, unauthenticated liveness probe.
    if (url.pathname === '/health' || url.pathname === '/healthz') {
      return json({ status: 'ok' });
    }

    if (url.pathname === '/mcp') {
      const isGatewayMode = (env.AUTH_MODE ?? 'env') === 'gateway';

      let baseUrl: string | undefined;
      let apiKey: string | undefined;

      if (isGatewayMode) {
        baseUrl = request.headers.get('x-hudu-base-url') ?? undefined;
        apiKey = request.headers.get('x-hudu-api-key') ?? undefined;
        if (!baseUrl || !apiKey) {
          return json(
            {
              error: 'Missing credentials',
              message:
                'Gateway mode requires X-Hudu-Base-URL and X-Hudu-API-Key headers',
              required: ['X-Hudu-Base-URL', 'X-Hudu-API-Key'],
            },
            401,
          );
        }
      } else {
        // env mode: read credentials from Worker secrets if present.
        // (Absent creds are fine — tools/list still works, tools/call errors.)
        baseUrl = env.HUDU_BASE_URL;
        apiKey = env.HUDU_API_KEY;
      }

      const config: McpServerConfig = {
        name: env.MCP_SERVER_NAME ?? 'hudu-mcp',
        version: env.MCP_SERVER_VERSION ?? '1.0.0',
        hudu: { baseUrl, apiKey },
      };
      const logger = createWorkerLogger((env.LOG_LEVEL as LogLevel) ?? 'info');

      // Fresh server + transport per request (stateless, fully isolated).
      const server = createWorkerMcpServer(config, logger);
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);

      try {
        const response = await transport.handleRequest(request);
        return withCors(response);
      } finally {
        await transport.close();
        await server.close();
      }
    }

    return json({ error: 'Not found', endpoints: ['/mcp', '/health'] }, 404);
  },
};
