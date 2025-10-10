/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 *
 */

export interface Options {
  root: string;
}
declare class FileStore<T> {
  _root: string;
  constructor(options: Options);
  get(key: Buffer): Promise<null | undefined | T>;
  set(key: Buffer, value: T): Promise<void>;
  _set(filePath: string, value: T): Promise<void>;
  clear(): void;
  _getFilePath(key: Buffer): string;
  _removeDirs(): void;
}
export default FileStore;