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

export declare type IterationOrder = unknown;
export declare type LookupBias = unknown;
export declare const FIRST_COLUMN: number;
export declare const FIRST_LINE: number;
export declare const GENERATED_ORDER: IterationOrder;
export declare const ORIGINAL_ORDER: IterationOrder;
export declare const GREATEST_LOWER_BOUND: LookupBias;
export declare const LEAST_UPPER_BOUND: LookupBias;
export declare const EMPTY_POSITION: any;
export declare function iterationOrderToString(x: IterationOrder): string;
export declare function lookupBiasToString(x: LookupBias): string;