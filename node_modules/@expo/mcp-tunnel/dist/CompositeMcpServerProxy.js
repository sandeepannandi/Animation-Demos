import { StdioMcpServerProxy } from './StdioMcpServerProxy.js';
import { TunnelMcpServerProxy } from './TunnelMcpServerProxy.js';
/**
 * A MCP server proxy that serves MCP capabilities for both `StdioMcpServerProxy` and `TunnelMcpServerProxy`.
 */
export class CompositeMcpServerProxy {
    stdioProxy;
    tunnelProxy;
    constructor({ tunnelServerUrl, stdioMcpServerName, stdioMcpServerVersion, }) {
        this.stdioProxy = new StdioMcpServerProxy({
            mcpServerName: stdioMcpServerName,
            mcpServerVersion: stdioMcpServerVersion,
        });
        this.tunnelProxy = new TunnelMcpServerProxy(tunnelServerUrl);
    }
    registerTool = (name, config, callback) => {
        this.stdioProxy.registerTool(name, config, callback);
        this.tunnelProxy.registerTool(name, config, callback);
    };
    registerPrompt = (name, config, callback) => {
        this.stdioProxy.registerPrompt(name, config, callback);
        this.tunnelProxy.registerPrompt(name, config, callback);
    };
    registerResource = (name, uriOrTemplate, config, readCallback) => {
        this.stdioProxy.registerResource(name, uriOrTemplate, config, readCallback);
        this.tunnelProxy.registerResource(name, uriOrTemplate, config, readCallback);
    };
    async start() {
        await Promise.all([this.stdioProxy.start(), this.tunnelProxy.start()]);
    }
    async close() {
        await Promise.all([this.stdioProxy.close(), this.tunnelProxy.close()]);
    }
}
