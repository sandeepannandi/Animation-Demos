// See: https://github.com/facebook/metro/blob/v0.82.0/packages/metro-config/src/defaults/index.js

// NOTE(cedric): This file can't be typed properly due to complex CJS structures
// NOTE(cedric): This file has lots more exports, but neither of them should be used directly by Expo

import type { ConfigT } from '../configTypes.flow';

interface getDefaultConfig {
  (rootPath: string | null): Promise<ConfigT>;
  getDefaultValues: (rootPath: string | null) => ConfigT;
}

declare const getDefaultValues: getDefaultConfig;
export default getDefaultValues;
