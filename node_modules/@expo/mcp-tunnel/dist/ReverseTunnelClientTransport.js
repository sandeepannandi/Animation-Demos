import WebSocket from 'ws';
import { JSON_RPC_VERSION } from './constants.js';
// Maximum message size supported by the server
const MAX_MESSAGE_SIZE = 1024 * 1024 * 1; // 1MB
/**
 * A MCP transport that connects to a WebSocket tunnel server and serves as a reverse proxy for the MCP server.
 */
export class ReverseTunnelClientTransport {
    logger;
    wsHeaders;
    ws;
    remoteUrl;
    reconnectInterval;
    reconnectTimer;
    isConnected = false;
    onConnectionChange;
    constructor(remoteUrl, options = {}) {
        const { reconnectInterval = 5000 } = options;
        this.logger = options.logger ?? console;
        this.wsHeaders = options.wsHeaders ?? {};
        // Ensure the URL points to the WebSocket tunnel endpoint
        this.remoteUrl = remoteUrl.endsWith('/tunnel') ? remoteUrl : `${remoteUrl}/tunnel`;
        this.reconnectInterval = reconnectInterval;
    }
    async start() {
        await this.connect();
    }
    async connect() {
        try {
            this.logger.debug(`[MCP] Connecting to remote MCP tunnel server at ${this.remoteUrl}...`);
            this.ws = new WebSocket(this.remoteUrl, { headers: this.wsHeaders });
            this.ws.on('open', () => {
                this.logger.debug('[MCP] Connected to remote MCP tunnel server');
                this.isConnected = true;
                // Clear any existing reconnect timer
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = undefined;
                }
                // Notify connection state change
                this.onConnectionChange?.(true);
            });
            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.onMessage?.(message);
                }
                catch (error) {
                    this.logger.error('[MCP] Failed to parse message from remote server:', error);
                }
            });
            this.ws.on('close', () => {
                this.logger.debug('[MCP] Disconnected from remote MCP tunnel server');
                this.isConnected = false;
                this.onConnectionChange?.(false);
                this.scheduleReconnect();
            });
            this.ws.on('error', (error) => {
                this.logger.error('[MCP] WebSocket error:', error);
                this.isConnected = false;
                this.onConnectionChange?.(false);
                this.scheduleReconnect();
            });
            // Wait for connection to be established
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);
                this.ws.on('open', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                this.ws.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
        }
        catch (error) {
            this.logger.error('[MCP] Failed to connect to remote MCP tunnel server:', error);
            this.scheduleReconnect();
            throw error;
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimer) {
            return; // Already scheduled
        }
        this.logger.debug(`[MCP] Reconnecting in ${this.reconnectInterval / 1000} seconds...`);
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = undefined;
            try {
                await this.connect();
            }
            catch {
                // Connection will be retried automatically
                this.logger.error('[MCP] Reconnection failed, will retry again');
            }
        }, this.reconnectInterval);
    }
    async send(message, options) {
        if (!this.ws || !this.isConnected) {
            throw new Error('Not connected to remote MCP tunnel server');
        }
        const messageStr = JSON.stringify(message);
        if (messageStr.length > MAX_MESSAGE_SIZE) {
            const messageId = 'id' in message ? message.id : undefined;
            this.ws.send(JSON.stringify({
                jsonrpc: JSON_RPC_VERSION,
                id: messageId,
                error: {
                    code: -32603,
                    message: `Message size exceeds the maximum supported size: size[${messageStr.length}] max[${MAX_MESSAGE_SIZE}]`,
                },
            }));
            return;
        }
        this.ws.send(messageStr);
    }
    async close() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
        this.isConnected = false;
        this.onConnectionChange?.(false);
    }
    onMessage;
}
