# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
