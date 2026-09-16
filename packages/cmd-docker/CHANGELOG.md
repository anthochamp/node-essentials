# Changelog

## 0.2.0

### Minor Changes

- a493b4a: Every command accepts a `context`, and the invocation is assembled in one place.
  
  - `DockerCommonOptions` adds `context` to all ten commands, emitted as
    `docker --context <name> <subcommand>`. Naming the context per command leaves
    the daemon the rest of the machine talks to alone, which `dockerContextUse`
    does not. `dockerNetworkRm` and `dockerContextShow` gain an options parameter
    to carry it.
  - The new internal `execDocker` owns where the CLI's global flags go — before
    the subcommand, which is the only position docker accepts them in — so no
    command interpolates its own string any more. Every command now asks
    `execAsync` for `utf8`; `dockerContainerRun` and the others that did not used
    to would have returned a `Buffer` had they read their output.
  - `DockerImageId` is exported, alongside `DockerContainerId` and
    `DockerContainerName`.

### Patch Changes

- 732a70b: Fix dockerContextShow() function
- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [70c1269]
  - @ac-kit/node@0.2.0
  - @ac-kit/format-shell@0.2.0

## [0.1.0] - 2026-09-01

### Added

- Initial release.
