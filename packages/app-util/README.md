
# @ac-essentials/app-util

This package provides reusable utilities for building Node.js applications—**primarily for my own use, but feel free to use it if it helps you too!** It focuses on logging, configuration, process management, and system helpers to keep your app code clean, robust, and consistent across projects.

## Installation

You can install the package via npm:

```bash
npm install @ac-essentials/app-util
```

Or via yarn:

```bash
yarn add @ac-essentials/app-util
```

## Utility Summary

Here's a categorized summary of the main utilities available in this package (see source for full details):

### Logger Utilities

- [logger](src/logger/logger.ts): Flexible, pluggable logger for structured and leveled logging.
- [logger-console](src/logger/logger-console.ts): Console logger implementation.
- [file-printer](src/logger/printers/file-printer.ts): Printer for writing logs to files with rotation support.
- [idle-mark-printer-proxy](src/logger/printers/idle-mark-printer-proxy.ts): Printer proxy that marks idle periods in logs.
- [no-repeat-printer-proxy](src/logger/printers/no-repeat-printer-proxy.ts): Printer proxy that suppresses repeated log messages.
- [text-stream-printer](src/logger/printers/text-stream-printer.ts): Printer for streaming logs as plain text.
- [compare-log-level](src/logger/util/compare-log-level.ts): Compare log levels by severity.
- [is-error-log-level](src/logger/util/is-error-log-level.ts): Check if a log level is considered an error.
- [record-equal](src/logger/util/record-equal.ts): Deep equality check for logger records.
- [ansi-record-stringifier](src/logger/util/record-stringifiers/ansi-record-stringifier.ts): Stringifier for log records with ANSI color formatting.
- [json-record-stringifier](src/logger/util/record-stringifiers/json-record-stringifier.ts): Stringifier for log records as JSON.

### CLI Config Utilities

- [load-config](src/cli-config/load-config.ts): Load and merge CLI configuration files with support for `extends`.

### App & System Utilities

- [find-repo-git-dir](src/find-repo-git-dir.ts): Find the nearest .git directory in a project.
- [run-command](src/run-command.ts): Run shell commands with logging and output capture.
- [rotate-log-files](src/system/fs/rotate-log-files.ts): Rotate and manage log files with retention policies.
- [get-processes-snapshot](src/system/os/get-processes-snapshot.ts): Get a snapshot of running system processes with filtering.
- [process-kill-by-pid-file](src/system/os/process-kill-by-pid-file.ts): Kill a process by reading its PID from a file.
- [process-wait-pid](src/system/os/process-wait-pid.ts): Wait for a process to terminate by PID.

## Usage

You can import and use the utilities in your project as follows:

```typescript
import { Logger } from '@ac-essentials/app-util';
```

For more detailed documentation and examples, please refer to the [official documentation](https://anthochamp.github.io/node-essentials/app-util/).

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue on the [GitHub repository](https://github.com/anthochamp/node-essentials).
