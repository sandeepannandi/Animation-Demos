/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 *
 */

import type { PluginObj } from "@babel/core";
import * as Babel from "@babel/core";
export interface PluginOptions {
  readonly ignoredRequires?: ReadonlyArray<string>;
  readonly inlineableCalls?: ReadonlyArray<string>;
  readonly nonMemoizedModules?: ReadonlyArray<string>;
  readonly memoizeCalls?: boolean;
}
export interface State {
  opts?: PluginOptions;
  ignoredRequires: Set<string>;
  inlineableCalls: Set<string>;
  membersAssigned: Map<string, Set<string>>;
}
declare const $$EXPORT_DEFAULT_DECLARATION$$: ($$PARAM_0$$: typeof Babel) => PluginObj<State>;
export default $$EXPORT_DEFAULT_DECLARATION$$;