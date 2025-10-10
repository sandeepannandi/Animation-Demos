/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 *
 */

import type { Options } from "./FileStore";
import FileStore from "./FileStore";
export interface CleanOptions extends Options {
  intervalMs?: number;
  cleanupThresholdMs?: number;
}
/**
 * A FileStore that cleans itself up in a given interval
 */
declare class AutoCleanFileStore<T> extends FileStore<T> {
  _intervalMs: number;
  _cleanupThresholdMs: number;
  _root: string;
  constructor(opts: CleanOptions);
  _scheduleCleanup(): void;
  _doCleanup(): void;
}
export default AutoCleanFileStore;