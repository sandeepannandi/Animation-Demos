/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 *
 */

import type HttpError from "./HttpError";
import type NetworkError from "./NetworkError";
import type { HttpOptions } from "..";
import HttpStore from "./HttpStore";
declare class HttpGetStore<T> extends HttpStore<T> {
  _warned: boolean;
  constructor(options: HttpOptions);
  get(key: Buffer): Promise<null | undefined | T>;
  set(): Promise<void>;
  _warn(err: HttpError | NetworkError): void;
}
export default HttpGetStore;