import { type McpServerProxy } from './types.js';
/**
 * A MCP server proxy that serves MCP capabilities as the stdio server transport.
 */
export declare class StdioMcpServerProxy implements McpServerProxy {
    private readonly server;
    private readonly transport;
    constructor({ mcpServerName, mcpServerVersion, }: {
        mcpServerName?: string;
        mcpServerVersion?: string;
    });
    registerTool: McpServerProxy['registerTool'];
    registerPrompt: McpServerProxy['registerPrompt'];
    registerResource: McpServerProxy['registerResource'];
    start(): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=StdioMcpServerProxy.d.ts.map