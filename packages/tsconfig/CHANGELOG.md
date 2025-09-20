# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-09-20

### Added

- Added `noUncheckedIndexedAccess = true` to `base.json`.
- Added `noUncheckedSideEffectImports = true` to `base.json`.

## [0.4.0] - 2025-09-19

### Changed

- Changed `lib` in `node-lib.json` and `node-cli.json` to include only `ESNext` (not `DOM`).
- Moved `target` definition from `base.json` to `node-lib.json` and `node-cli.json` (set to `ESNext`).

### Added

- Added `dom-lib.json` config for projects needing DOM types.

## [0.3.0] - 2025-09-19

### Changed

- Changed `allowSyntheticDefaultImports` to `true` in `base.json`.

## [0.2.1] - 2025-09-13

### Fixed

- Added `resolveJsonModule: null` directive in `node-cli.json`.
