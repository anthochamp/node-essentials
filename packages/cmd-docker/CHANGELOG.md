# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Adds `rm`, `network`, `addHost`, and `volume` options to `dockerContainerRun`

### Added

- `dockerContainerExec` mimics `docker exec` command to execute a command in a
  running container.
- `dockerContainerStop` mimics `docker stop` command to stop a running
  container.
- `dockerNetworkCreate` mimics `docker network create` command to create a new
  network.
- `dockerNetworkRemove` mimics `docker network rm` command to remove a network.

## [0.1.5] - 2026-08-08

### Changed

- Upgrade `@ac-essentials/util` dependency to `^0.7.0`.

## [0.1.4] - 2026-03-01

### Changed

- Upgrade `@ac-essentials/util` dependency to `^0.6.0`.

## [0.1.3] - 2025-09-20

### Fixed

- Fix unchecked indexed access.

### Changed

- Bump `type-fest` dependency to `^5.0.1`.

## [0.1.2] - 2025-09-20

### Fixed

- Fixed dependencies binding in `package.json`.

## [0.1.1] - 2025-09-13

### Added

- Added `sideEffects: false` to package.json for better tree-shaking.
