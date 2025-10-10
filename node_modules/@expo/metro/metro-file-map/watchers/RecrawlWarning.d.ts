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

declare class RecrawlWarning {
  static RECRAWL_WARNINGS: Array<RecrawlWarning>;
  static REGEXP: RegExp;
  root: string;
  count: number;
  constructor(root: string, count: number);
  static findByRoot(root: string): null | undefined | RecrawlWarning;
  static isRecrawlWarningDupe(warningMessage: any): boolean;
}
export default RecrawlWarning;