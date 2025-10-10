import { type Transport, type TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js';
import { type JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
export declare class ReverseTunnelClientTransport implements Transport {
    private ws?;
    private remoteUrl;
    private reconnectInterval;
    private reconnectTimer?;
    private isConnected;
    onConnectionChange?: (connected: boolean) => void;
    constructor(remoteUrl: string, options?: {
        reconnectInterval?: number;
    });
    start(): Promise<void>;
    private connect;
    private scheduleReconnect;
    send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void>;
    close(): Promise<void>;
    onMessage?: (message: JSONRPCMessage) => void;
}
//# sourceMappingURL=reverse-tunnel-client.d.ts.map