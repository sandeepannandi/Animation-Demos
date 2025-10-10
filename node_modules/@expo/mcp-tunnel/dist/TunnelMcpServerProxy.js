import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ReverseTunnelClientTransport } from './ReverseTunnelClientTransport.js';
import { JSON_RPC_VERSION, WS_METHOD_MCP_PROMPTS_GET, WS_METHOD_MCP_RESOURCES_READ, WS_METHOD_MCP_TOOLS_CALL, WS_METHOD_REGISTER_MCP_PROMPT, WS_METHOD_REGISTER_MCP_RESOURCE, WS_METHOD_REGISTER_MCP_TOOL, } from './constants.js';
/**
 * A MCP server proxy that connects to a WebSocket tunnel server and allows the remote MCP server to serve MCP capabilities from local.
 */
export class TunnelMcpServerProxy {
    logger;
    transport;
    registeredTools = new Map();
    registeredPrompts = new Map();
    registeredResources = new Map();
    isConnected = false;
    constructor(remoteUrl, options = {}) {
        this.logger = options.logger ?? console;
        this.transport = new ReverseTunnelClientTransport(remoteUrl, options);
        // Listen for connection events to refresh registrations
        this.transport.onConnectionChange = (connected) => {
            this.isConnected = connected;
            if (connected) {
                this.refreshAllRegistrations();
            }
        };
        // Set up message handler to route incoming requests to registered callbacks
        this.transport.onMessage = (message) => {
            this.handleIncomingMessage(message);
        };
    }
    async start() {
        await this.transport.start();
    }
    async close() {
        await this.transport.close();
    }
    registerTool = (name, config, callback) => {
        const serializedTool = {
            name,
            title: config.title,
            description: config.description,
            inputSchema: config.inputSchema ? zodToJsonSchema(z.object(config.inputSchema)) : undefined,
            outputSchema: config.outputSchema
                ? zodToJsonSchema(z.object(config.outputSchema))
                : undefined,
            callback,
        };
        this.registeredTools.set(name, serializedTool);
        // If connected, send registration immediately
        if (this.isConnected) {
            this.sendToolRegistration(serializedTool);
        }
    };
    registerPrompt = (name, config, callback) => {
        const serializedPrompt = {
            name,
            title: config.title,
            description: config.description,
            argsSchema: config.argsSchema ? zodToJsonSchema(z.object(config.argsSchema)) : undefined,
            callback,
        };
        this.registeredPrompts.set(name, serializedPrompt);
        // If connected, send registration immediately
        if (this.isConnected) {
            this.sendPromptRegistration(serializedPrompt);
        }
    };
    registerResource = (name, uriOrTemplate, config, readCallback) => {
        const uri = typeof uriOrTemplate === 'string' ? uriOrTemplate : uriOrTemplate.uriTemplate;
        const serializedResource = {
            name,
            title: config.title,
            description: config.description,
            mimeType: config.mimeType,
            uri: uri,
            callback: readCallback,
        };
        this.registeredResources.set(name, serializedResource);
        // If connected, send registration immediately
        if (this.isConnected) {
            this.sendResourceRegistration(serializedResource);
        }
    };
    async refreshAllRegistrations() {
        this.logger.debug('[MCP] Refreshing all MCP registrations...');
        // Register all tools
        for (const tool of this.registeredTools.values()) {
            await this.sendToolRegistration(tool);
        }
        // Register all prompts
        for (const prompt of this.registeredPrompts.values()) {
            await this.sendPromptRegistration(prompt);
        }
        // Register all resources
        for (const resource of this.registeredResources.values()) {
            await this.sendResourceRegistration(resource);
        }
        this.logger.debug(`[MCP] Refreshed ${this.registeredTools.size} tools, ${this.registeredPrompts.size} prompts, ${this.registeredResources.size} resources`);
    }
    async sendToolRegistration(tool) {
        try {
            const { callback, ...toolData } = tool;
            await this.transport.send({
                jsonrpc: JSON_RPC_VERSION,
                method: WS_METHOD_REGISTER_MCP_TOOL,
                params: toolData,
            });
        }
        catch (error) {
            this.logger.error(`[MCP] Failed to register tool ${tool.name}:`, error);
        }
    }
    async sendPromptRegistration(prompt) {
        try {
            const { callback, ...promptData } = prompt;
            await this.transport.send({
                jsonrpc: JSON_RPC_VERSION,
                method: WS_METHOD_REGISTER_MCP_PROMPT,
                params: promptData,
            });
        }
        catch (error) {
            this.logger.error(`[MCP] Failed to register prompt ${prompt.name}:`, error);
        }
    }
    async sendResourceRegistration(resource) {
        try {
            const { callback, ...resourceData } = resource;
            await this.transport.send({
                jsonrpc: JSON_RPC_VERSION,
                method: WS_METHOD_REGISTER_MCP_RESOURCE,
                params: resourceData,
            });
        }
        catch (error) {
            this.logger.error(`[MCP] Failed to register resource ${resource.name}:`, error);
        }
    }
    // Getter methods for accessing registered items (useful for debugging/inspection)
    getRegisteredTools() {
        return new Map([...this.registeredTools.entries()].map(([key, { callback, ...rest }]) => [key, rest]));
    }
    getRegisteredPrompts() {
        return new Map([...this.registeredPrompts.entries()].map(([key, { callback, ...rest }]) => [key, rest]));
    }
    getRegisteredResources() {
        return new Map([...this.registeredResources.entries()].map(([key, { callback, ...rest }]) => [key, rest]));
    }
    get connected() {
        return this.isConnected;
    }
    async handleIncomingMessage(message) {
        try {
            // Only handle JSON-RPC requests (messages with id and method)
            if (!message.id || !message.method) {
                return;
            }
            let result;
            let error;
            try {
                switch (message.method) {
                    case WS_METHOD_MCP_TOOLS_CALL:
                        result = await this.handleToolCall(message.params);
                        break;
                    case WS_METHOD_MCP_PROMPTS_GET:
                        result = await this.handlePromptGet(message.params);
                        break;
                    case WS_METHOD_MCP_RESOURCES_READ:
                        result = await this.handleResourceRead(message.params);
                        break;
                    default:
                        error = {
                            code: -32601,
                            message: `Method not found: ${message.method}`,
                        };
                }
            }
            catch (err) {
                error = {
                    code: -32603,
                    message: err instanceof Error ? err.message : 'Internal error',
                };
            }
            // Send JSON-RPC response back to the server
            const response = {
                jsonrpc: JSON_RPC_VERSION,
                id: message.id,
            };
            if (error) {
                response.error = error;
            }
            else {
                response.result = result;
            }
            await this.transport.send(response);
        }
        catch (error) {
            this.logger.error('[MCP] Failed to handle incoming message:', error);
        }
    }
    async handleToolCall(params) {
        const { name, arguments: args = {} } = params;
        const tool = this.registeredTools.get(name);
        if (!tool) {
            throw new Error(`Tool not found: ${name}`);
        }
        return await tool.callback(args);
    }
    async handlePromptGet(params) {
        const { name, arguments: args = {} } = params;
        const prompt = this.registeredPrompts.get(name);
        if (!prompt) {
            throw new Error(`Prompt not found: ${name}`);
        }
        return await prompt.callback(args);
    }
    async handleResourceRead(params) {
        const { uri } = params;
        // Find resource by URI
        let matchedResource;
        for (const resource of this.registeredResources.values()) {
            if (resource.uri === uri) {
                matchedResource = resource;
                break;
            }
        }
        if (!matchedResource) {
            throw new Error(`Resource not found: ${uri}`);
        }
        return await matchedResource.callback(uri);
    }
}
