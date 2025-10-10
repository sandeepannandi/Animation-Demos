/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 * @oncall react_native
 */

import type ModuleCache from "./ModuleCache";
import type Package from "./Package";
declare class Module {
  path: string;
  _moduleCache: ModuleCache;
  _sourceCode: null | undefined | string;
  constructor(file: string, moduleCache: ModuleCache);
  getPackage(): null | undefined | Package;
  invalidate(): void;
}
export default Module;