---
"@ac-kit/cmd-docker": minor
---

Every command accepts a `context`, and the invocation is assembled in one place.

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
