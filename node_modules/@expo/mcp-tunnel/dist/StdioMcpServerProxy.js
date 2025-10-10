import { McpServer, } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
/**
 * A MCP server proxy that serves MCP capabilities as the stdio server transport.
 */
export class StdioMcpServerProxy {
    server;
    transport = new StdioServerTransport();
    constructor({ mcpServerName = 'Expo MCP Server', mcpServerVersion = '1.0.0', }) {
        this.server = new McpServer({
            name: mcpServerName,
            version: mcpServerVersion,
        });
    }
    registerTool = (name, config, callback) => {
        this.server.registerTool(name, config, callback);
    };
    registerPrompt = (name, config, callback) => {
        this.server.registerPrompt(name, config, callback);
    };
    registerResource = (name, uriOrTemplate, config, readCallback) => {
        if (typeof uriOrTemplate === 'string') {
            this.server.registerResource(name, uriOrTemplate, config, readCallback);
        }
        else {
            this.server.registerResource(name, uriOrTemplate, config, readCallback);
        }
    };
    start() {
        return this.server.connect(this.transport);
    }
    close() {
        return this.server.close();
    }
}
