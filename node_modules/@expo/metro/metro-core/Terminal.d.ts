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

import type * as _nodeStream from "node:stream";
import type * as _nodeNet from "node:net";
import tty from "node:tty";
type UnderlyingStream = _nodeNet.Socket | _nodeStream.Writable;
/**
 * We don't just print things to the console, sometimes we also want to show
 * and update progress. This utility just ensures the output stays neat: no
 * missing newlines, no mangled log lines.
 *
 *     const terminal = Terminal.default;
 *     terminal.status('Updating... 38%');
 *     terminal.log('warning: Something happened.');
 *     terminal.status('Updating, done.');
 *     terminal.persistStatus();
 *
 * The final output:
 *
 *     warning: Something happened.
 *     Updating, done.
 *
 * Without the status feature, we may get a mangled output:
 *
 *     Updating... 38%warning: Something happened.
 *     Updating, done.
 *
 * This is meant to be user-readable and TTY-oriented. We use stdout by default
 * because it's more about status information than diagnostics/errors (stderr).
 *
 * Do not add any higher-level functionality in this class such as "warning" and
 * "error" printers, as it is not meant for formatting/reporting. It has the
 * single responsibility of handling status messages.
 */
declare class Terminal {
  _logLines: Array<string>;
  _nextStatusStr: string;
  _statusStr: string;
  _stream: UnderlyingStream;
  _ttyStream: null | undefined | tty.WriteStream;
  _updatePromise: Promise<void> | null;
  _isUpdating: boolean;
  _isPendingUpdate: boolean;
  _shouldFlush: boolean;
  _writeStatusThrottled: ($$PARAM_0$$: string) => void;
  constructor(stream: UnderlyingStream, $$PARAM_1$$: {
    ttyPrint?: boolean;
  });
  _scheduleUpdate(): void;
  waitForUpdates(): Promise<void>;
  flush(): Promise<void>;
  _update(): Promise<void>;
  status(format: string, ...args: Array<any>): string;
  log(format: string, ...args: Array<any>): void;
  persistStatus(): void;
}
export default Terminal;