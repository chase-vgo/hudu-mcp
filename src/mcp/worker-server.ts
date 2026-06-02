/**
 * Side-effect-free MCP server factory for the Cloudflare Workers runtime.
 *
 * Importing this module never opens a socket or starts a transport, so it is
 * safe to load on `workerd`. It reuses the exact same `HuduService`,
 * `HuduToolHandler` and `HuduResourceHandler` as the stdio / Node HTTP server
 * (`HuduMcpServer`), so there is no second tool implementation to maintain.
 *
 * Unlike `mcp/server.ts`, it imports neither `node:http` nor the Node-only
 * stdio/streamable transports, keeping the Worker bundle free of Node server
 * internals that do not run on `workerd`.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { HuduService } from '../services/hudu.service.js';
import { HuduResourceHandler } from '../handlers/resource.handler.js';
import { HuduToolHandler } from '../handlers/tool.handler.js';
import { Logger } from '../utils/logger.js';
import { McpServerConfig } from '../types/mcp.js';

const SERVER_INSTRUCTIONS = `# Hudu MCP Server

This server provides access to Hudu IT documentation platform through the Model Context Protocol.

## Available Resources:
- **hudu://companies**, **hudu://companies/{id}** - Company data
- **hudu://assets**, **hudu://assets/{id}** - Asset data
- **hudu://articles**, **hudu://articles/{id}** - Knowledge base articles

## Authentication:
- HUDU_BASE_URL (required) - Your Hudu instance URL
- HUDU_API_KEY (required) - Your Hudu API key`;

function setupHandlers(
  server: Server,
  toolHandler: HuduToolHandler,
  resourceHandler: HuduResourceHandler,
  logger: Logger,
): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      const resources = await resourceHandler.listResources();
      return { resources };
    } catch (error) {
      logger.error('Failed to list resources:', error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list resources: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      const content = await resourceHandler.readResource(request.params.uri);
      return { contents: [content] };
    } catch (error) {
      logger.error(`Failed to read resource ${request.params.uri}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      const tools = await toolHandler.listTools();
      return { tools };
    } catch (error) {
      logger.error('Failed to list tools:', error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const result = await toolHandler.callTool(
        request.params.name,
        request.params.arguments || {},
      );
      return { content: result.content, isError: result.isError };
    } catch (error) {
      logger.error(`Failed to call tool ${request.params.name}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to call tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  });
}

/**
 * Create a fresh, fully-isolated MCP server for a single request.
 *
 * `config.hudu` carries the credentials (resolved from gateway headers or
 * Worker env). Each call builds its own `HuduService` + handlers, so concurrent
 * requests for different tenants never share state.
 *
 * `tools/list` and `initialize` work without credentials; only `tools/call`
 * surfaces the missing-credentials error from `HuduService`.
 */
export function createWorkerMcpServer(
  config: McpServerConfig,
  logger: Logger,
): Server {
  const service = new HuduService(config, logger);
  const toolHandler = new HuduToolHandler(service, logger);
  const resourceHandler = new HuduResourceHandler(service, logger);

  const server = new Server(
    { name: config.name, version: config.version },
    {
      capabilities: {
        resources: { subscribe: false, listChanged: true },
        tools: { listChanged: true },
      },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  server.onerror = (error) => logger.error('MCP Server error:', error);

  setupHandlers(server, toolHandler, resourceHandler, logger);
  return server;
}
