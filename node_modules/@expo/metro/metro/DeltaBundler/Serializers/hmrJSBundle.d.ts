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

import type { EntryPointURL } from "../../HmrServer";
import type { DeltaResult, ReadOnlyGraph } from "../types.flow";
import type { HmrModule } from "../../../metro-runtime/modules/types.flow";
export interface Options {
  readonly clientUrl: EntryPointURL;
  readonly createModuleId: ($$PARAM_0$$: string) => number;
  readonly includeAsyncPaths: boolean;
  readonly projectRoot: string;
  readonly serverRoot: string;
}
declare function hmrJSBundle(delta: DeltaResult, graph: ReadOnlyGraph, options: Options): {
  readonly added: ReadonlyArray<HmrModule>;
  readonly deleted: ReadonlyArray<number>;
  readonly modified: ReadonlyArray<HmrModule>;
};
export default hmrJSBundle;