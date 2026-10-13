const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Transitional isolated app: shared source sits outside this package, but React
// and native dependencies must resolve only from this app, not legacy Next.
config.watchFolders = [path.resolve(__dirname, '../../packages')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
// expo-router's route context also picks up the *.web.tsx files. Their web-only
// Skia loader (CanvasKit via fs) cannot be bundled for Android or iOS, so resolve it to
// an empty module there. Those files are never rendered on native.
const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && moduleName.startsWith('@shopify/react-native-skia/lib/module/web')) {
    return { type: 'empty' };
  }
  return (upstreamResolve ?? context.resolveRequest)(context, moduleName, platform);
};
module.exports = config;
