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

import Module from "./Module";
import Package from "./Package";
type GetClosestPackageFn = (absoluteFilePath: string) => null | undefined | {
  packageJsonPath: string;
  packageRelativePath: string;
};
declare class ModuleCache {
  _getClosestPackage: GetClosestPackageFn;
  _moduleCache: {
    [filePath: string]: Module;
  };
  _packageCache: {
    [filePath: string]: Package;
  };
  _packagePathAndSubpathByModulePath: {
    [filePath: string]: null | undefined | {
      packageJsonPath: string;
      packageRelativePath: string;
    };
  };
  _modulePathsByPackagePath: {
    [filePath: string]: Set<string>;
  };
  constructor(options: {
    getClosestPackage: GetClosestPackageFn;
  });
  getModule(filePath: string): Module;
  getPackage(filePath: string): Package;
  getPackageForModule(module: Module): null | undefined | {
    pkg: Package;
    packageRelativePath: string;
  };
  getPackageOf(absoluteModulePath: string): null | undefined | {
    pkg: Package;
    packageRelativePath: string;
  };
  invalidate(filePath: string): void;
}
export default ModuleCache;