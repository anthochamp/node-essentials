
# Miscellaneous utilities for JavaScript and TypeScript

This package provides a collection of utility functions and types that can be used in various JavaScript and TypeScript projects. It includes functions for string manipulation, number formatting, object merging, timer management, and more.

## Installation

You can install the package via npm:

```bash
npm install @ac-essentials/misc-util
```

Or via yarn:

```bash
yarn add @ac-essentials/misc-util
```

## Utility Summary

Here's a quick overview of the main utilities available in this package (see source for full details):

### Async & Concurrency

- [`file-lock`](src/async/file-lock.ts): Cross-process file locking utility for async code.
- [`mutex`](src/async/mutex.ts): Mutual exclusion lock for synchronizing async operations.
- [`semaphore`](src/async/semaphore.ts): Counting semaphore for limiting concurrency.
- [`signal`](src/async/signal.ts): Async signaling primitive for event notification.
- [`subscribable`](src/async/subscribable.ts): Simple event subscription and notification utility.
- [`udp-bind-lock`](src/async/udp-bind-lock.ts): Lock using UDP port binding for cross-process coordination.
- [`wait-notifiable`](src/async/wait-notifiable.ts): Wait for a condition to be notified asynchronously.
- [`subscribable-event`](src/async/subscribable-event.ts): Type-safe event emitter for async code.

### Data Structures

- [`binary-heap`](src/data/binary-heap.ts): Binary heap data structure for efficient priority queue operations.
- [`deque`](src/data/deque.ts): Double-ended queue supporting fast push/pop at both ends.
- [`doubly-linked-list`](src/data/doubly-linked-list.ts): Doubly linked list implementation.
- [`linked-list`](src/data/linked-list.ts): Singly linked list implementation.
- [`native-array`](src/data/native-array.ts): Wrapper for native arrays with extra utility methods.
- [`priority-queue`](src/data/priority-queue.ts): Priority queue built on a binary heap.
- [`queue`](src/data/queue.ts): FIFO queue data structure.
- [`stack`](src/data/stack.ts): LIFO stack data structure.

### ECMAScript Utilities

- [`aggregate-error`](src/ecma/error/aggregate-error.ts): Helpers for working with AggregateError and error-like objects.
- [`capture-stack-trace`](src/ecma/error/capture-stack-trace.ts): Capture and parse stack traces from errors.
- [`error`](src/ecma/error/error.ts): Helpers for working with Error and error-like objects.
- [`error-stack`](src/ecma/error/error-stack.ts): Parse and format error stack traces.
- [`format-error`](src/ecma/error/format-error.ts): Format errors and their causes for readable output.
- [`traverse-error`](src/ecma/error/traverse-error.ts): Traverse error chains and aggregates.
- [`unimplemented-error`](src/ecma/error/unimplemented-error.ts): Error class for unimplemented features.
- [`unsupported-error`](src/ecma/error/unsupported-error.ts): Error class for unsupported features or environments.
- [`abortable`](src/ecma/function/abortable.ts): Wrap a function to make it abortable via AbortSignal.
- [`debounce-queue`](src/ecma/function/debounce-queue.ts): Debounce async functions so only one runs at a time.
- [`no-throw`](src/ecma/function/no-throw.ts): Wrap a function to catch and suppress errors.
- [`wait-for`](src/ecma/function/wait-for.ts): Wait until a condition is true, with polling and abort support.
- [`clone`](src/ecma/object/clone.ts): Shallow clone a value (non-recursive).
- [`deep-clone`](src/ecma/object/deep-clone.ts): Deep clone a value using structuredClone.
- [`deep-merge`](src/ecma/object/deep-merge.ts): Deep merge two objects, returning a new object.
- [`deep-merge-inplace`](src/ecma/object/deep-merge-inplace.ts): Deep merge two objects, mutating the target.
- [`defaults`](src/ecma/object/defaults.ts): Assign default options to an object (like lodash.defaults).
- [`is-deep-equal`](src/ecma/object/is-deep-equal.ts): Deep equality check using strict strategy.
- [`is-equal`](src/ecma/object/is-equal.ts): Various equality comparison strategies for values.
- [`camelCase`](src/ecma/string/camel-case.ts): Convert a string to camelCase.
- [`kebabCase`](src/ecma/string/kebab-case.ts): Convert a string to kebab-case.
- [`lowerCase`](src/ecma/string/lower-case.ts): Convert a string to lower case with spaces.
- [`lowerFirst`](src/ecma/string/lower-first.ts): Lowercase the first character of a string.
- [`snakeCase`](src/ecma/string/snake-case.ts): Convert a string to snake_case.
- [`startCase`](src/ecma/string/start-case.ts): Convert a string to Start Case.
- [`upperCase`](src/ecma/string/upper-case.ts): Convert a string to UPPER CASE with spaces.
- [`upperFirst`](src/ecma/string/upper-first.ts): Uppercase the first character of a string.
- [`capitalize`](src/ecma/string/capitalize.ts): Capitalize the first letter and lowercase the rest of a string.
- [`join-non-empty`](src/ecma/string/join-non-empty.ts): Join non-empty strings with a separator.
- [`prefix-lines`](src/ecma/string/prefix-lines.ts): Prefix each line of a string with a given prefix.
- [`replace-diacritics`](src/ecma/string/replace-diacritics.ts): Replace diacritics in a string with base characters.
- [`truncate`](src/ecma/string/truncate.ts): Truncate a string to a given length, with options.
- [`average`](src/ecma/math/average.ts): Functions for mean, geometricMean, harmonicMean, rootMeanSquare, median, mode, midrange.
- [`minmax`](src/ecma/math/minmax.ts): Get the minimum and maximum from a list of numbers.
- [`clamp`](src/ecma/math/clamp.ts): Clamp a number between a minimum and maximum value.
- [`random`](src/ecma/math/random.ts): Get a random value between min and max.
- [`round`](src/ecma/math/round.ts): Round a number to a specified number of decimal places or precision.
- [`scale`](src/ecma/math/scale.ts): Scale a number in 0..1 to a new range.
- [`to-fixed-length`](src/ecma/number/to-fixed-length.ts): Format a number to a fixed-length string.
- [`abortable-promise`](src/ecma/promise/abortable-promise.ts): Promise subclass with abort support.
- [`delay`](src/ecma/timers/delay.ts): Delay execution of a callback by a given number of milliseconds.
- [`periodical-timer`](src/ecma/timers/periodical-timer.ts): Timer that calls a callback at regular intervals.
- [`sleep`](src/ecma/timers/sleep.ts): Sleep for a specified number of milliseconds.
- [`timer`](src/ecma/timers/timer.ts): Simple timer that calls a callback after a delay.

### Node.js Utilities

- [`exec-async`](src/node/child_process/exec-async.ts): Run a shell command asynchronously and get the result.
- [`node-exec-error`](src/node/child_process/node-exec-error.ts): Error class for child process execution errors.
- [`process-exit-error`](src/node/child_process/process-exit-error.ts): Error class for process exit errors.
- [`shell-exec`](src/node/child_process/shell-exec.ts): Run a shell command with advanced options.
- [`node-aggregate-error`](src/node/error/node-aggregate-error.ts): Node.js-specific AggregateError helpers.
- [`node-error`](src/node/error/node-error.ts): Node.js-specific Error helpers.
- [`node-system-error`](src/node/error/node-system-error.ts): Node.js system error helpers.
- [`compress-file`](src/node/fs/compress-file.ts): Compress a file using gzip.
- [`exists-async`](src/node/fs/exists-async.ts): Check if a file exists asynchronously.
- [`file-content-equal`](src/node/fs/file-content-equal.ts): Compare file contents for equality.
- [`shorten-posix-path`](src/node/fs/shorten-posix-path.ts): Shorten a POSIX path for display.
- [`write-file-atomic`](src/node/fs/write-file-atomic.ts): Write a file atomically to avoid partial writes.
- [`import-module`](src/node/module/import-module.ts): Dynamically import a module.
- [`resolve-module`](src/node/module/resolve-module.ts): Resolve a module path like Node.js does.
- [`get-random-ephemeral-port`](src/node/net/get-random-ephemeral-port.ts): Get a random available ephemeral port.
- [`http-headers`](src/node/net/http/http-headers.ts): Utilities for working with HTTP headers.
- [`is-http-available`](src/node/net/http/is-http-available.ts): Check if an HTTP endpoint is available.
- [`tcp-client`](src/node/net/tcp-client.ts): Simple TCP client utility.
- [`udp-socket`](src/node/net/udp-socket.ts): Simple UDP socket utility.
- [`error-listeners`](src/node/process/error-listeners.ts): Manage process error listeners.
- [`exit-manager`](src/node/process/exit-manager.ts): Manage process exit handlers.
- [`pid-file`](src/node/process/pid-file.ts): Manage PID files for processes.
- [`process-pid-file`](src/node/process/process-pid-file.ts): Manage and check process PID files.
- [`capture-v8-stack-trace`](src/node/v8/capture-v8-stack-trace.ts): Capture V8 stack traces.
- [`v8-stack-trace`](src/node/v8/v8-stack-trace.ts): Parse and format V8 stack traces.

### Shell Utilities

- [`parse-env-variable`](src/shell/env-variables/parse-env-variable.ts): Parse an environment variable string.
- [`stringify-env-variable`](src/shell/env-variables/stringify-env-variable.ts): Stringify an environment variable value.
- [`escape-command`](src/shell/escape-command.ts): Escape a shell command for safe execution.
- [`escape-command-arg`](src/shell/escape-command-arg.ts): Escape a shell command argument for safe execution.
- [`escape-posix-sh-sqe`](src/shell/escape-posix-sh-sqe.ts): Escape a string for POSIX shell single-quoted expression.

### Text & File Utilities

- [`text-file`](src/text-files/text-file.ts): Read, write, and analyze text files with encoding and formatting options.
- [`json-file`](src/text-files/json-file.ts): Read and write JSON files with comments and formatting support.
- [`json5-file`](src/text-files/json5-file.ts): Read and write JSON5 files.
- [`jsonc-file`](src/text-files/jsonc-file.ts): Read and write JSONC (JSON with comments) files.
- [`ini-file`](src/text-files/ini-file.ts): Read and write INI files.
- [`toml-file`](src/text-files/toml-file.ts): Read and write TOML files.
- [`yaml-file`](src/text-files/yaml-file.ts): Read and write YAML files.

### Time

- [`format-duration`](src/time/format-duration.ts): Format a duration in milliseconds as a human-readable string.

### 3rd Party Utilities

- [`chardet-charset-to-buffer-encoding`](src/3rdparty/chardet/chardet-charset-to-buffer-encoding.ts): Charset conversion helpers for chardet.
- [`editorconfig-charset-to-buffer-encoding`](src/3rdparty/editorconfig/editorconfig-charset-to-buffer-encoding.ts): Charset conversion helpers for editorconfig.
- [`flock`](src/3rdparty/fs-ext/flock.ts): File locking helpers using fs-ext.

### Types

- [`defined`](src/types.d/defined.ts): Type utility for filtering out undefined values.
- [`set-nullable`](src/types.d/set-nullable.ts): Type utility for making properties nullable.

## Usage

You can import and use the utilities in your project as follows:

```typescript
import { truncate } from '@ac-essentials/misc-util';

const shortString = truncate("This is a very long string that needs to be truncated.", { length: 20 });
console.log(shortString); // Output: "This is a very lo..."
```

For more detailed documentation and examples, please refer to the [official documentation](https://anthochamp.github.io/node-essentials/misc-util/).

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue on the [GitHub repository](https://github.com/anthochamp/node-essentials).
