import { type Logger, type McpServerProxy, type SerializedMcpPrompt, type SerializedMcpResource, type SerializedMcpTool } from './types.js';
/**
 * A MCP server proxy that connects to a WebSocket tunnel server and allows the remote MCP server to serve MCP capabilities from local.
 */
export declare class TunnelMcpServerProxy implements McpServerProxy {
    private readonly logger;
    private transport;
    private registeredTools;
    private registeredPrompts;
    private registeredResources;
    private isConnected;
    constructor(remoteUrl: string, options?: {
        reconnectInterval?: number;
        wsHeaders?: Record<string, string>;
        logger?: Logger;
    });
    start(): Promise<void>;
    close(): Promise<void>;
    registerTool: McpServerProxy['registerTool'];
    registerPrompt: McpServerProxy['registerPrompt'];
    registerResource: McpServerProxy['registerResource'];
    private refreshAllRegistrations;
    private sendToolRegistration;
    private sendPromptRegistration;
    private sendResourceRegistration;
    getRegisteredTools(): ReadonlyMap<string, SerializedMcpTool>;
    getRegisteredPrompts(): ReadonlyMap<string, SerializedMcpPrompt>;
    getRegisteredResources(): ReadonlyMap<string, SerializedMcpResource>;
    get connected(): boolean;
    private handleIncomingMessage;
    private handleToolCall;
    private handlePromptGet;
    private handleResourceRead;
}
//# sourceMappingURL=TunnelMcpServerProxy.d.ts.map