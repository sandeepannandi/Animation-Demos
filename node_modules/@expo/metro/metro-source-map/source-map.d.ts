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

import type { IConsumer } from "./Consumer/types.flow";
import Generator from "./Generator";
export type { IConsumer };
type GeneratedCodeMapping = [number, number];
type SourceMapping = [number, number, number, number];
type SourceMappingWithName = [number, number, number, number, string];
export type MetroSourceMapSegmentTuple = SourceMappingWithName | SourceMapping | GeneratedCodeMapping;
export interface HermesFunctionOffsets {
  [$$Key$$: number]: ReadonlyArray<number>;
}
export type FBSourcesArray = ReadonlyArray<null | undefined | FBSourceMetadata>;
export type FBSourceMetadata = [null | undefined | FBSourceFunctionMap];
export interface FBSourceFunctionMap {
  readonly names: ReadonlyArray<string>;
  readonly mappings: string;
}
export interface FBSegmentMap {
  [id: string]: MixedSourceMap;
}
export interface BasicSourceMap {
  readonly file?: string;
  readonly mappings: string;
  readonly names: Array<string>;
  readonly sourceRoot?: string;
  readonly sources: Array<string>;
  readonly sourcesContent?: Array<null | undefined | string>;
  readonly version: number;
  readonly x_facebook_offsets?: Array<number>;
  readonly x_metro_module_paths?: Array<string>;
  readonly x_facebook_sources?: FBSourcesArray;
  readonly x_facebook_segments?: FBSegmentMap;
  readonly x_hermes_function_offsets?: HermesFunctionOffsets;
  readonly x_google_ignoreList?: Array<number>;
}
export interface _IndexMapSection_offset {
  line: number;
  column: number;
}
export interface IndexMapSection {
  map?: IndexMap | BasicSourceMap;
  offset: _IndexMapSection_offset;
}
export interface IndexMap {
  readonly file?: string;
  readonly mappings?: void;
  readonly sourcesContent?: void;
  readonly sections: Array<IndexMapSection>;
  readonly version: number;
  readonly x_facebook_offsets?: Array<number>;
  readonly x_metro_module_paths?: Array<string>;
  readonly x_facebook_sources?: void;
  readonly x_facebook_segments?: FBSegmentMap;
  readonly x_hermes_function_offsets?: HermesFunctionOffsets;
  readonly x_google_ignoreList?: void;
}
export type MixedSourceMap = IndexMap | BasicSourceMap;
export { BundleBuilder } from "./BundleBuilder";
export { default as composeSourceMaps } from "./composeSourceMaps";
export { default as Consumer } from "./Consumer";
export { createIndexMap } from "./BundleBuilder";
export { generateFunctionMap } from "./generateFunctionMap";
export declare function fromRawMappings(modules: ReadonlyArray<{
  readonly map?: null | ReadonlyArray<MetroSourceMapSegmentTuple>;
  readonly functionMap?: null | FBSourceFunctionMap;
  readonly path: string;
  readonly source: string;
  readonly code: string;
  readonly isIgnored: boolean;
  readonly lineCount?: number;
}>, offsetLines?: number): Generator;
export declare function fromRawMappingsNonBlocking(modules: ReadonlyArray<{
  readonly map?: null | ReadonlyArray<MetroSourceMapSegmentTuple>;
  readonly functionMap?: null | FBSourceFunctionMap;
  readonly path: string;
  readonly source: string;
  readonly code: string;
  readonly isIgnored: boolean;
  readonly lineCount?: number;
}>, offsetLines?: number): Promise<Generator>;
export { functionMapBabelPlugin } from "./generateFunctionMap";
export { default as normalizeSourcePath } from "./Consumer/normalizeSourcePath";
export declare function toBabelSegments(sourceMap: BasicSourceMap): Array<any>;
export declare function toSegmentTuple(mapping: any): MetroSourceMapSegmentTuple;