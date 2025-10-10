/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 *
 */

import type * as _babel_types from "@babel/types";
/**
 * Select unused names for "metroImportDefault" and "metroImportAll", by
 * calling "generateUid".
 */
declare function generateImportNames(ast: _babel_types.Node): {
  importAll: string;
  importDefault: string;
};
export default generateImportNames;