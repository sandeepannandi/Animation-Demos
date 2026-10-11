const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Transitional isolated app: shared source sits outside this package, but React
// and native dependencies must resolve only from this app, not legacy Next.
config.watchFolders = [path.resolve(__dirname, '../../packages')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
module.exports = config;
