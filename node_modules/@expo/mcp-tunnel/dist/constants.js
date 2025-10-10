/**
 * JSON-RPC version
 */
export const JSON_RPC_VERSION = '2.0';
/**
 * WebSocket method: to register MCP tool (client -> server)
 */
export const WS_METHOD_REGISTER_MCP_TOOL = 'register_mcp_tool';
/**
 * WebSocket method: to register MCP prompt (client -> server)
 */
export const WS_METHOD_REGISTER_MCP_PROMPT = 'register_mcp_prompt';
/**
 * WebSocket method: to register MCP resource (client -> server)
 */
export const WS_METHOD_REGISTER_MCP_RESOURCE = 'register_mcp_resource';
/**
 * WebSocket method: call MCP tool (server -> client)
 */
export const WS_METHOD_MCP_TOOLS_CALL = 'tools/call';
/**
 * WebSocket method: get MCP prompt (server -> client)
 */
export const WS_METHOD_MCP_PROMPTS_GET = 'prompts/get';
/**
 * WebSocket method: read MCP resource (server -> client)
 */
export const WS_METHOD_MCP_RESOURCES_READ = 'resources/read';
