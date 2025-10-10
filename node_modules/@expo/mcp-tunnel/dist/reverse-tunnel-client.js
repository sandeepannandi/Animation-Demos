import WebSocket from 'ws';
export class ReverseTunnelClientTransport {
    ws;
    remoteUrl;
    reconnectInterval;
    reconnectTimer;
    isConnected = false;
    onConnectionChange;
    constructor(remoteUrl, options = {}) {
        const { reconnectInterval = 5000 } = options;
        // Ensure the URL points to the WebSocket tunnel endpoint
        this.remoteUrl = remoteUrl.endsWith('/tunnel') ? remoteUrl : `${remoteUrl}/tunnel`;
        this.reconnectInterval = reconnectInterval;
    }
    async start() {
        await this.connect();
    }
    async connect() {
        try {
            console.log(`Connecting to remote MCP tunnel server at ${this.remoteUrl}...`);
            const accessToken = process.env.EXPO_TOKEN;
            const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
            this.ws = new WebSocket(this.remoteUrl, { headers });
            this.ws.on('open', () => {
                console.log('Connected to remote MCP tunnel server');
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
                    console.error('Failed to parse message from remote server:', error);
                }
            });
            this.ws.on('close', () => {
                console.log('Disconnected from remote MCP tunnel server');
                this.isConnected = false;
                this.onConnectionChange?.(false);
                this.scheduleReconnect();
            });
            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error);
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
            console.error('Failed to connect to remote MCP tunnel server:', error);
            this.scheduleReconnect();
            throw error;
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimer) {
            return; // Already scheduled
        }
        console.log(`Reconnecting in ${this.reconnectInterval / 1000} seconds...`);
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = undefined;
            try {
                await this.connect();
            }
            catch {
                // Connection will be retried automatically
                console.error('Reconnection failed, will retry again');
            }
        }, this.reconnectInterval);
    }
    async send(message, options) {
        if (!this.ws || !this.isConnected) {
            throw new Error('Not connected to remote MCP tunnel server');
        }
        const messageStr = JSON.stringify(message);
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
