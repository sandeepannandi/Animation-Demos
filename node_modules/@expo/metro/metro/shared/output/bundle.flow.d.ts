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

import type { BuildOptions, OutputOptions, RequestOptions } from "../types.flow";
import Server from "../../Server";
export declare function build(packagerClient: Server, requestOptions: RequestOptions, buildOptions?: BuildOptions): void;
export declare function save(bundle: {
  code: string;
  map: string;
}, options: OutputOptions, log: ($$PARAM_0$$: string) => void): void;
export declare const formatName: "bundle";