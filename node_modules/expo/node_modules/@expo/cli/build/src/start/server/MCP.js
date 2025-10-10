"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "maybeCreateMCPServerAsync", {
    enumerable: true,
    get: function() {
        return maybeCreateMCPServerAsync;
    }
});
function _resolvefrom() {
    const data = /*#__PURE__*/ _interop_require_default(require("resolve-from"));
    _resolvefrom = function() {
        return data;
    };
    return data;
}
const _UserSettings = require("../../api/user/UserSettings");
const _log = require("../../log");
const _env = require("../../utils/env");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const importESM = require('@expo/cli/add-module');
const debug = require('debug')('expo:start:server:mcp');
async function maybeCreateMCPServerAsync(projectRoot) {
    const mcpServer = _env.env.EXPO_UNSTABLE_MCP_SERVER;
    if (!mcpServer) {
        return null;
    }
    const mcpPackagePath = _resolvefrom().default.silent(projectRoot, 'expo-mcp');
    if (!mcpPackagePath) {
        _log.Log.error('Missing the `expo-mcp` package in the project. To enable the MCP integration, add the `expo-mcp` package to your project.');
        return null;
    }
    const normalizedServer = /^([a-zA-Z][a-zA-Z\d+\-.]*):\/\//.test(mcpServer) ? mcpServer : `wss://${mcpServer}`;
    const mcpServerUrlObject = new URL(normalizedServer);
    const scheme = mcpServerUrlObject.protocol ?? 'wss:';
    const mcpServerUrl = `${scheme}//${mcpServerUrlObject.host}`;
    debug(`Creating MCP tunnel - server URL: ${mcpServerUrl}`);
    try {
        const { addMcpCapabilities } = await importESM(mcpPackagePath);
        const { TunnelMcpServerProxy } = await importESM('@expo/mcp-tunnel');
        const logger = {
            ..._log.Log,
            debug (...message) {
                debug(...message);
            },
            info (...message) {
                _log.Log.log(...message);
            }
        };
        const server = new TunnelMcpServerProxy(mcpServerUrl, {
            logger,
            wsHeaders: createAuthHeaders()
        });
        addMcpCapabilities(server, projectRoot);
        return server;
    } catch (error) {
        debug(`Error creating MCP tunnel: ${error}`);
    }
    return null;
}
function createAuthHeaders() {
    var _getSession;
    const token = (0, _UserSettings.getAccessToken)();
    if (token) {
        return {
            authorization: `Bearer ${token}`
        };
    }
    const sessionSecret = (_getSession = (0, _UserSettings.getSession)()) == null ? void 0 : _getSession.sessionSecret;
    if (sessionSecret) {
        return {
            'expo-session': sessionSecret
        };
    }
    return {};
}

//# sourceMappingURL=MCP.js.map