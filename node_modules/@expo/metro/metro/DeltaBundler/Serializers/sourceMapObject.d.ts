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

import type { Module } from "../types.flow";
import type { SourceMapGeneratorOptions } from "./sourceMapGenerator";
import type { MixedSourceMap } from "../../../metro-source-map";
export declare function sourceMapObject(modules: ReadonlyArray<Module>, options: SourceMapGeneratorOptions): MixedSourceMap;
export declare function sourceMapObjectNonBlocking(modules: ReadonlyArray<Module>, options: SourceMapGeneratorOptions): Promise<MixedSourceMap>;