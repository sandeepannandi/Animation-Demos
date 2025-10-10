/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 *
 */

import type { IntermediateStackFrame } from "../metro/Server/symbolicate";
import type { HandleFunction, Server } from "connect";
import type { CacheStore } from "../metro-cache";
import type $$IMPORT_TYPEOF_1$$ from "../metro-cache";
type MetroCache = typeof $$IMPORT_TYPEOF_1$$;
import type { CacheManagerFactory } from "../metro-file-map";
import type { CustomResolver } from "../metro-resolver";
import type { JsTransformerConfig } from "../metro-transform-worker";
import type { TransformResult } from "../metro/DeltaBundler";
import type { DeltaResult, Module, ReadOnlyGraph, SerializerOptions } from "../metro/DeltaBundler/types.flow";
import type { Reporter } from "../metro/lib/reporting";
import type MetroServer from "../metro/Server";
export interface _ExtraTransformOptions_transform {
  readonly experimentalImportSupport?: boolean;
  readonly inlineRequires?: {
    readonly blockList: {
      readonly [$$Key$$: string]: true;
    };
  } | boolean;
  readonly nonInlinedRequires?: ReadonlyArray<string>;
  readonly unstable_disableES6Transforms?: boolean;
  readonly unstable_memoizeInlineRequires?: boolean;
  readonly unstable_nonMemoizedInlineRequires?: ReadonlyArray<string>;
}
export interface ExtraTransformOptions {
  readonly preloadedModules?: {
    readonly [path: string]: true;
  } | false;
  readonly ramGroups?: ReadonlyArray<string>;
  readonly transform?: _ExtraTransformOptions_transform;
}
export interface GetTransformOptionsOpts {
  dev: boolean;
  hot: boolean;
  platform?: null | string;
}
export type GetTransformOptions = (entryPoints: ReadonlyArray<string>, options: GetTransformOptionsOpts, getDependenciesOf: ($$PARAM_0$$: string) => Promise<Array<string>>) => Promise<Partial<ExtraTransformOptions>>;
export type Middleware = HandleFunction;
type PerfAnnotations = Partial<{
  string: {
    readonly [key: string]: string;
  };
  int: {
    readonly [key: string]: number;
  };
  double: {
    readonly [key: string]: number;
  };
  bool: {
    readonly [key: string]: boolean;
  };
  string_array: {
    readonly [key: string]: ReadonlyArray<string>;
  };
  int_array: {
    readonly [key: string]: ReadonlyArray<number>;
  };
  double_array: {
    readonly [key: string]: ReadonlyArray<number>;
  };
  bool_array: {
    readonly [key: string]: ReadonlyArray<boolean>;
  };
}>;
export interface PerfLoggerPointOptions {
  readonly timestamp?: number;
}
export interface PerfLogger {
  point(name: string, opts?: PerfLoggerPointOptions): void;
  annotate(annotations: PerfAnnotations): void;
  subSpan(label: string): PerfLogger;
}
export interface RootPerfLogger extends PerfLogger {
  start(opts?: PerfLoggerPointOptions): void;
  end(status: "SUCCESS" | "FAIL" | "CANCEL", opts?: PerfLoggerPointOptions): void;
}
export interface PerfLoggerFactoryOptions {
  readonly key?: number;
}
export type PerfLoggerFactory = (type: "START_UP" | "BUNDLING_REQUEST" | "HMR", opts?: PerfLoggerFactoryOptions) => RootPerfLogger;
export interface _ResolverConfigT_extraNodeModules {
  [name: string]: string;
}
export interface _ResolverConfigT_unstable_conditionsByPlatform {
  readonly [platform: string]: ReadonlyArray<string>;
}
export interface ResolverConfigT {
  assetExts: ReadonlyArray<string>;
  assetResolutions: ReadonlyArray<string>;
  blacklistRE?: RegExp | Array<RegExp>;
  blockList?: RegExp | Array<RegExp>;
  disableHierarchicalLookup: boolean;
  dependencyExtractor?: null | string;
  emptyModulePath: string;
  enableGlobalPackages: boolean;
  extraNodeModules: _ResolverConfigT_extraNodeModules;
  hasteImplModulePath?: null | string;
  nodeModulesPaths: ReadonlyArray<string>;
  platforms: ReadonlyArray<string>;
  resolveRequest?: null | CustomResolver;
  resolverMainFields: ReadonlyArray<string>;
  sourceExts: ReadonlyArray<string>;
  unstable_conditionNames: ReadonlyArray<string>;
  unstable_conditionsByPlatform: _ResolverConfigT_unstable_conditionsByPlatform;
  unstable_enablePackageExports: boolean;
  useWatchman: boolean;
  requireCycleIgnorePatterns: ReadonlyArray<RegExp>;
}
export interface SerializerConfigT {
  createModuleIdFactory: () => (path: string) => number;
  customSerializer?: null | ((entryPoint: string, preModules: ReadonlyArray<Module>, graph: ReadOnlyGraph, options: SerializerOptions) => Promise<string | {
    code: string;
    map: string;
  }>);
  experimentalSerializerHook: (graph: ReadOnlyGraph, delta: DeltaResult) => any;
  getModulesRunBeforeMainModule: (entryFilePath: string) => Array<string>;
  getPolyfills: ($$PARAM_0$$: {
    platform?: null | string;
  }) => ReadonlyArray<string>;
  getRunModuleStatement: ($$PARAM_0$$: number | string) => string;
  polyfillModuleNames: ReadonlyArray<string>;
  processModuleFilter: (modules: Module) => boolean;
  isThirdPartyModule: (module: {
    readonly path: string;
  }) => boolean;
}
export interface _TransformerConfigT_transformVariants {
  readonly [name: string]: {};
}
export interface TransformerConfigT extends JsTransformerConfig {
  getTransformOptions: GetTransformOptions;
  transformVariants: _TransformerConfigT_transformVariants;
  publicPath: string;
  unstable_workerThreads: boolean;
}
export interface MetalConfigT {
  cacheStores: ReadonlyArray<CacheStore<TransformResult>>;
  cacheVersion: string;
  fileMapCacheDirectory?: string;
  hasteMapCacheDirectory?: string;
  unstable_fileMapCacheManagerFactory?: CacheManagerFactory;
  maxWorkers: number;
  unstable_perfLoggerFactory?: null | undefined | PerfLoggerFactory;
  projectRoot: string;
  stickyWorkers: boolean;
  transformerPath: string;
  reporter: Reporter;
  resetCache: boolean;
  watchFolders: ReadonlyArray<string>;
}
export interface ServerConfigT {
  /** @deprecated */
  enhanceMiddleware: ($$PARAM_0$$: Middleware, $$PARAM_1$$: MetroServer) => Middleware | Server;
  forwardClientLogs: boolean;
  port: number;
  rewriteRequestUrl: ($$PARAM_0$$: string) => string;
  unstable_serverRoot?: null | string;
  useGlobalHotkey: boolean;
  verifyConnections: boolean;
}
export interface SymbolicatorConfigT {
  customizeFrame: ($$PARAM_0$$: {
    readonly file?: null | string;
    readonly lineNumber?: null | number;
    readonly column?: null | number;
    readonly methodName?: null | string;
  }) => (null | undefined | {
    readonly collapse?: boolean;
  }) | Promise<null | undefined | {
    readonly collapse?: boolean;
  }>;
  customizeStack: ($$PARAM_0$$: Array<IntermediateStackFrame>, $$PARAM_1$$: any) => Array<IntermediateStackFrame> | Promise<Array<IntermediateStackFrame>>;
}
export interface _WatcherConfigT_healthCheck {
  readonly enabled: boolean;
  readonly interval: number;
  readonly timeout: number;
  readonly filePrefix: string;
}
export interface _WatcherConfigT_unstable_autoSaveCache {
  readonly enabled: boolean;
  readonly debounceMs?: number;
}
export interface _WatcherConfigT_watchman {
  readonly deferStates: ReadonlyArray<string>;
}
export interface WatcherConfigT {
  additionalExts: ReadonlyArray<string>;
  healthCheck: _WatcherConfigT_healthCheck;
  unstable_autoSaveCache: _WatcherConfigT_unstable_autoSaveCache;
  unstable_lazySha1: boolean;
  unstable_workerThreads: boolean;
  watchman: _WatcherConfigT_watchman;
}
export type InputConfigT = Readonly<Partial<{} & MetalConfigT & {
  readonly cacheStores?: ReadonlyArray<CacheStore<TransformResult>> | (($$PARAM_0$$: MetroCache) => ReadonlyArray<CacheStore<TransformResult>>);
  readonly resolver: Readonly<Partial<ResolverConfigT>>;
  readonly server: Readonly<Partial<ServerConfigT>>;
  readonly serializer: Readonly<Partial<SerializerConfigT>>;
  readonly symbolicator: Readonly<Partial<SymbolicatorConfigT>>;
  readonly transformer: Readonly<Partial<TransformerConfigT>>;
  readonly watcher: Readonly<Partial<{
    healthCheck?: Readonly<Partial<WatcherConfigT["healthCheck"]>>;
    unstable_autoSaveCache?: Readonly<Partial<WatcherConfigT["unstable_autoSaveCache"]>>;
  } & WatcherConfigT>>;
}>>;
export type MetroConfig = InputConfigT;
export type IntermediateConfigT = {} & MetalConfigT & {
  resolver: ResolverConfigT;
  server: ServerConfigT;
  serializer: SerializerConfigT;
  symbolicator: SymbolicatorConfigT;
  transformer: TransformerConfigT;
  watcher: WatcherConfigT;
};
export type ConfigT = {} & Readonly<MetalConfigT> & {
  readonly resolver: Readonly<ResolverConfigT>;
  readonly server: Readonly<ServerConfigT>;
  readonly serializer: Readonly<SerializerConfigT>;
  readonly symbolicator: Readonly<SymbolicatorConfigT>;
  readonly transformer: Readonly<TransformerConfigT>;
  readonly watcher: Readonly<WatcherConfigT>;
};
export interface YargArguments {
  readonly config?: string;
  readonly cwd?: string;
  readonly port?: string | number;
  readonly host?: string;
  readonly projectRoot?: string;
  readonly watchFolders?: Array<string>;
  readonly assetExts?: Array<string>;
  readonly sourceExts?: Array<string>;
  readonly platforms?: Array<string>;
  readonly "max-workers"?: string | number;
  readonly maxWorkers?: string | number;
  readonly transformer?: string;
  readonly "reset-cache"?: boolean;
  readonly resetCache?: boolean;
  readonly verbose?: boolean;
}