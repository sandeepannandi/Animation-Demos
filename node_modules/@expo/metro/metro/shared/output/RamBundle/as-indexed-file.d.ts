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

import type { RamBundleInfo } from "../../../DeltaBundler/Serializers/getRamBundleInfo";
import type { ModuleGroups, ModuleTransportLike, OutputOptions } from "../../types.flow";
export declare function save(bundle: RamBundleInfo, options: OutputOptions, log: (...args: Array<string>) => void): void;
export declare function buildTableAndContents(startupCode: string, modules: ReadonlyArray<ModuleTransportLike>, moduleGroups: ModuleGroups, encoding?: "utf8" | "utf16le" | "ascii"): void;
export declare function createModuleGroups(groups: Map<number, Set<number>>, modules: ReadonlyArray<ModuleTransportLike>): void;