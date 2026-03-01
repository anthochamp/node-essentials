# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2026-03-01

### Fixed

- Fix exports for `intersection`, `getObjectKeys` and `traverse`.

## [0.6.0] - 2026-03-01

### Fixed

- Fixed an edge case in the `Counter::wait` method when the counter is incremented
rapidly (was missing the value).
- Fixed `jsonSerialize` and `jsonStringify` functions to handle circular references correctly.
- Fixed `FileLock` implementation.

### Changed

- `debounceQueue` function is now called `serializeQueueNext`
- Renamed `ILockable` interface to `ILock`.
- All classes implementing `ILock` now throw an `LockNotAcquiredError` when
`release` is called without a matching `acquire`.
- `TcpSocket` and `DgramSocket` (previously `TcpClient` and `UdpSocket`, respectively) classes reimplemented.
- `SubscribableEvent` function is now called `Event`.
- `Subscribable` is replaced with `IEventDispatcher` interface.
- `jsonStringifySafe` function is now called `jsonStringify` and accepts options for handling circular references.
- `jsonSerialize` function is now safe (handles circular references, BigInt and Error's serialization).

### Removed

- Removed `MaybeAsyncCallback`, `AsyncCallback` and `Callback` types (use MaybeAsyncCallable, AsyncCallable, and Callable respectively instead).
- Removed `abortable` and `abortableAsync` functions (no replacement).
- Removed `AbortablePromise` class (no replacement).
- Removed `ILock::withLock` utility method (use `LockHold` class instead).
- Removed `IWaitable` interface and `waitNotifiable` function (no replacement).
- Removed `jsonSerializeError` (use `jsonSerialize` instead).

### Added

- Added `InetAddress` and `InetEndpoint` classes.
- Added `TcpServer`, `StreamSocket`, `IpcSocket` and `TlsSocket` classes.
- Added `removeSafe` utility for arrays.
- Added `compact` utility for arrays.
- Added `MaybeAsyncDisposable` type.
- Added `Barrier` and `Latch` synchronization primitives.
- Added `LockHold` class.
- Added `Condition` synchronization primitive.
- Added `RwLock` synchronization class.
- Added `Channel` and `Broadcast` classes.
- Added `IEventDispatcher` and `IEventDispatcherMap` interfaces.
- Added `eventDispatcherToAsyncIterator` utility.
- Added `intersection` utility for arrays.
- Added `getObjectKeys` utility.
- Added `traverse` utility for objects.
- Added `HttpTrailers` class.

## [0.5.1] - 2025-10-06

### Fixed

- Fixed `httpFieldUnfoldValues` implementation.

### Added

- Added `httpIsRedirectStatus` utility.
- Added custom node inspect on `HttpFields` class.

## [0.5.0] - 2025-10-05

### Fixed

- Fixed `isEqual` type definition.

### Changed

- Replaced HTTP headers management functions with `HttpFields` and `HttpHeaders` classes.

### Added

- Added `uniq` and `uniqBy` array's utilities.
- Added `Counter` async utility.
- Added `CaseInsensitiveMap` class.
- Added `StringPointer` class.
- Added `escapePath` utility.
- Added geometry TS types.
- Added `stringIsEqual` utility.
- Added `SuppressedError` class compatibility.
- Added `Pattern` type and utilities.

### Removed

- Removed regexpEscape & formatDuration utilities.

## [0.4.1] - 2025-09-20

### Fixed

- Fix unchecked indexed access.

### Changed

- Bump `type-fest` dependency to `^5.0.1`.

## [0.4.0] - 2025-09-19

### Changed

- Updated dependencies to their latest versions.
- Changed the signature of `isHttpAvailable` to accept a signal instead of a timeout.

### Fixed

- Documentation improvements.
- Fixed `ErrorListeners` class implementation and error types definitions.

## [0.3.0] - 2025-09-19

### Changed

- `capitalize` now lowercases the rest of the string after the first character for more consistent behavior.

### Added

- New string case utilities: `camelCase`, `kebabCase`, `lowerCase`, `lowerFirst`, `snakeCase`, `startCase`, `upperCase` and `upperFirst`.
- New math utilities: `mean`, `geometricMean`, `harmonicMean`, `rootMeanSquare`, `median`, `mode`, `midrange` and `minmax`.

## [0.2.1] - 2025-09-13

### Fixed

- Exports for `text-files` utilities.

### Added

- Added `sideEffects: false` to package.json for better tree-shaking.
