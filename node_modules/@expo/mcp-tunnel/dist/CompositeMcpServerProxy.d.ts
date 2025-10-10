import { McpServerProxy } from './types.js';
/**
 * A MCP server proxy that serves MCP capabilities for both `StdioMcpServerProxy` and `TunnelMcpServerProxy`.
 */
export declare class CompositeMcpServerProxy implements McpServerProxy {
    private readonly stdioProxy;
    private readonly tunnelProxy;
    constructor({ tunnelServerUrl, stdioMcpServerName, stdioMcpServerVersion, }: {
        tunnelServerUrl: string;
        stdioMcpServerName?: string;
        stdioMcpServerVersion?: string;
    });
    registerTool: McpServerProxy['registerTool'];
    registerPrompt: McpServerProxy['registerPrompt'];
    registerResource: McpServerProxy['registerResource'];
    start(): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=CompositeMcpServerProxy.d.ts.map