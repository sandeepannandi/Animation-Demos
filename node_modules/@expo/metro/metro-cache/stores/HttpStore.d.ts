/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 *
 */

import type * as _nodeHttp from "node:http";
import HttpError from "./HttpError";
import NetworkError from "./NetworkError";
import http from "node:http";
import https from "node:https";
export type Options = EndpointOptions | {
  getOptions: EndpointOptions;
  setOptions: EndpointOptions;
};
export interface _EndpointOptions_headers {
  [$$Key$$: string]: string;
}
export interface EndpointOptions {
  endpoint: string;
  family?: 4 | 6;
  timeout?: number;
  key?: string | ReadonlyArray<string> | Buffer | ReadonlyArray<Buffer>;
  cert?: string | ReadonlyArray<string> | Buffer | ReadonlyArray<Buffer>;
  ca?: string | ReadonlyArray<string> | Buffer | ReadonlyArray<Buffer>;
  params?: URLSearchParams;
  headers?: _EndpointOptions_headers;
  additionalSuccessStatuses?: ReadonlyArray<number>;
  /**
   * Whether to include additional debug information in error messages.
   */
  debug?: boolean;
  /**
   * Retry configuration
   */
  maxAttempts?: number;
  retryNetworkErrors?: boolean;
  retryStatuses?: ReadonlySet<number>;
  socketPath?: string;
  proxy?: string;
}
export interface _Endpoint_headers {
  [$$Key$$: string]: string;
}
export interface Endpoint {
  module?: typeof http | typeof https;
  host: string;
  path: string;
  port: number;
  agent?: _nodeHttp.Agent | _nodeHttp.Agent;
  params: URLSearchParams;
  headers?: _Endpoint_headers;
  timeout: number;
  additionalSuccessStatuses: ReadonlySet<number>;
  debug: boolean;
  /**
   * Retry configuration
   */
  maxAttempts: number;
  retryNetworkErrors: boolean;
  retryStatuses: ReadonlySet<number>;
}
declare class HttpStore<T> {
  static HttpError: typeof HttpError;
  static NetworkError: typeof NetworkError;
  _getEndpoint: Endpoint;
  _setEndpoint: Endpoint;
  constructor(options: Options);
  createEndpointConfig(options: EndpointOptions): Endpoint;
  get(key: Buffer): Promise<null | undefined | T>;
  set(key: Buffer, value: T): Promise<void>;
  clear(): void;
}
export default HttpStore;