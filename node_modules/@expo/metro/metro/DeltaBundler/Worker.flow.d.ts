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

import type { TransformResult } from "./types.flow";
import type { LogEntry } from "../../metro-core/Logger";
import type { JsTransformerConfig, JsTransformOptions } from "../../metro-transform-worker";
export type { JsTransformOptions as TransformOptions } from "../../metro-transform-worker";
export interface Worker {
  readonly transform: typeof transform;
}
export interface TransformerConfig {
  transformerPath: string;
  transformerConfig: JsTransformerConfig;
}
export interface Data {
  readonly result: TransformResult;
  readonly sha1: string;
  readonly transformFileStartLogEntry: LogEntry;
  readonly transformFileEndLogEntry: LogEntry;
}
declare function transform(filename: string, transformOptions: JsTransformOptions, projectRoot: string, transformerConfig: TransformerConfig, fileBuffer?: Buffer): Promise<Data>;
declare const $$EXPORT_DEFAULT_DECLARATION$$: Worker;
export default $$EXPORT_DEFAULT_DECLARATION$$;