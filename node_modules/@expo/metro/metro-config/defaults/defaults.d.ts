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

import type { RootPerfLogger } from "../configTypes.flow";
export declare const assetExts: any;
export declare const assetResolutions: any;
export declare const sourceExts: any;
export declare const additionalExts: any;
export declare const moduleSystem: string;
export declare const platforms: any;
export declare const DEFAULT_METRO_MINIFIER_PATH: "metro-minify-terser";
export { default as defaultCreateModuleIdFactory } from "../../metro/lib/createModuleIdFactory";
export declare const noopPerfLoggerFactory: () => RootPerfLogger;