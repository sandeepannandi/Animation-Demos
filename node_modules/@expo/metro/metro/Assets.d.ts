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

export interface AssetInfo {
  readonly files: Array<string>;
  readonly hash: string;
  readonly name: string;
  readonly scales: Array<number>;
  readonly type: string;
}
export interface AssetDataWithoutFiles {
  readonly __packager_asset: boolean;
  readonly fileSystemLocation: string;
  readonly hash: string;
  readonly height?: null | number;
  readonly httpServerLocation: string;
  readonly name: string;
  readonly scales: Array<number>;
  readonly type: string;
  readonly width?: null | number;
}
export interface AssetDataFiltered {
  readonly __packager_asset: boolean;
  readonly hash: string;
  readonly height?: null | number;
  readonly httpServerLocation: string;
  readonly name: string;
  readonly scales: Array<number>;
  readonly type: string;
  readonly width?: null | number;
}
export type AssetData = AssetDataWithoutFiles & {
  readonly files: Array<string>;
};
export type AssetDataPlugin = (assetData: AssetData) => AssetData | Promise<AssetData>;
export declare function getAsset(relativePath: string, projectRoot: string, watchFolders: ReadonlyArray<string>, platform: null | undefined | string, assetExts: ReadonlyArray<string>): Promise<Buffer>;
export declare function getAssetSize(type: string, content: Buffer, filePath: string): null | undefined | {
  readonly width: number;
  readonly height: number;
};
export declare function getAssetData(assetPath: string, localPath: string, assetDataPlugins: ReadonlyArray<string>, platform: null | undefined | string, publicPath: string): Promise<AssetData>;
export declare function getAssetFiles(assetPath: string, platform?: null | undefined | string): Promise<Array<string>>;
export declare function isAssetTypeAnImage(type: string): boolean;