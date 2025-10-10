import { type McpServerProxy, type SerializedMcpPrompt, type SerializedMcpResource, type SerializedMcpTool } from './types.js';
export declare class TunnelMcpServerProxy implements McpServerProxy {
    private transport;
    private registeredTools;
    private registeredPrompts;
    private registeredResources;
    private isConnected;
    constructor(remoteUrl: string, options?: {
        reconnectInterval?: number;
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
//# sourceMappingURL=mcp-server-proxy.d.ts.map