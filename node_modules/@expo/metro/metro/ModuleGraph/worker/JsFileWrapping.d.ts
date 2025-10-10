/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 *
 */

import type { File } from "@babel/types";
export declare const WRAP_NAME: "$$_REQUIRE";
export declare function wrapJson(source: string, globalPrefix: string, unstable_useStaticHermesModuleFactory?: boolean): string;
export declare function jsonToCommonJS(source: string): string;
export declare function wrapModule(fileAst: File, importDefaultName: string, importAllName: string, dependencyMapName: string, globalPrefix: string, skipRequireRename: boolean, _optionalArg?: {
  readonly unstable_useStaticHermesModuleFactory?: boolean;
}): {
  ast: File;
  requireName: string;
};
export declare function wrapPolyfill(fileAst: File): File;