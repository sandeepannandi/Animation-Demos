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

import type * as _babel_types from "@babel/types";
import type { BabelFileMetadata } from "@babel/core";
export interface CustomTransformOptions {
  [$$Key$$: string]: any;
}
export declare const enum _TransformProfile {
  _default = "default",
  hermesStable = "hermes-stable",
  hermesCanary = "hermes-canary",
}
export type TransformProfile = `${_TransformProfile}`;
export interface BabelTransformerOptions {
  readonly customTransformOptions?: CustomTransformOptions;
  readonly dev: boolean;
  readonly enableBabelRCLookup?: boolean;
  readonly enableBabelRuntime?: boolean | string;
  readonly extendsBabelConfigPath?: string;
  readonly experimentalImportSupport?: boolean;
  readonly hermesParser?: boolean;
  readonly hot: boolean;
  readonly minify: boolean;
  readonly unstable_disableES6Transforms?: boolean;
  readonly platform?: null | string;
  readonly projectRoot: string;
  readonly publicPath: string;
  readonly unstable_transformProfile?: TransformProfile;
  readonly globalPrefix: string;
  readonly inlineRequires?: void;
}
export interface BabelTransformerArgs {
  readonly filename: string;
  readonly options: BabelTransformerOptions;
  readonly plugins?: any["plugins"];
  readonly src: string;
}
export interface BabelFileFunctionMapMetadata {
  readonly names: ReadonlyArray<string>;
  readonly mappings: string;
}
export type BabelFileImportLocsMetadata = ReadonlySet<string>;
export interface _MetroBabelFileMetadata_metro {
  functionMap?: null | undefined | BabelFileFunctionMapMetadata;
  unstable_importDeclarationLocs?: null | undefined | BabelFileImportLocsMetadata;
}
export interface MetroBabelFileMetadata extends BabelFileMetadata {
  metro?: null | undefined | _MetroBabelFileMetadata_metro;
}
export interface BabelTransformer {
  readonly transform: ($$PARAM_0$$: BabelTransformerArgs) => {
    readonly ast: _babel_types.File;
    readonly functionMap?: BabelFileFunctionMapMetadata;
    readonly metadata?: MetroBabelFileMetadata;
  };
  readonly getCacheKey?: () => string;
}
declare const $$EXPORT_DEFAULT_DECLARATION$$: BabelTransformer;
export default $$EXPORT_DEFAULT_DECLARATION$$;