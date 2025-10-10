import { type Transport, type TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js';
import { type JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { type Logger } from './types.js';
/**
 * A MCP transport that connects to a WebSocket tunnel server and serves as a reverse proxy for the MCP server.
 */
export declare class ReverseTunnelClientTransport implements Transport {
    private readonly logger;
    private readonly wsHeaders;
    private ws?;
    private remoteUrl;
    private reconnectInterval;
    private reconnectTimer?;
    private isConnected;
    onConnectionChange?: (connected: boolean) => void;
    constructor(remoteUrl: string, options?: {
        reconnectInterval?: number;
        wsHeaders?: Record<string, string>;
        logger?: Logger;
    });
    start(): Promise<void>;
    private connect;
    private scheduleReconnect;
    send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void>;
    close(): Promise<void>;
    onMessage?: (message: JSONRPCMessage) => void;
}
//# sourceMappingURL=ReverseTunnelClientTransport.d.ts.map