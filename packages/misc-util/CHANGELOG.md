# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fixed `abortable` and `abortableAsync` functions when AbortSignal is aborted
before calling the wrapped function (impact `AbortablePromise` as well).
- Fixed an edge case in the `Counter::wait` method when the counter is incremented
rapidly (was missing the value).
- Fixed `FileLock` implementation.

### Changed

- The `AbortablePromise` now rejects itself the promise when the signal is aborted.
- All classes implementing `ILockable` now throw an `LockNotAcquiredError` when
`release` is called without a matching `acquire`.

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
