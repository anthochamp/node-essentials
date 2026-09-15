# @ac-bench/core

Condition/case registration, opaque execution contracts, the per-condition
runner, the `MeasureData` wire shape, and the two plugin contracts — measure and
reporter — with the measure registry.

Exposed through two subpaths, for two audiences that must not drag each other
in:

- `@ac-bench/core/runner` — bench files, `@ac-bench/measure-*` registration
  APIs, and the child process. `registerCondition`/`registerCase`,
  `beforeAll`/`afterAll`/`beforeEach`/`afterEach`, `drainConditions`,
  `BenchCondition`, `BenchCaseRunContext`, `runForkUnit`.
- `@ac-bench/core/plugin` — the CLI, and third-party measure and reporter
  packages. `MeasurePlugin`, `ReporterPlugin`, `MeasureRegistry`,
  `partitionPlugins`, `renderTable`.

There is no root `"."` export: importing `@ac-bench/core` bare is a type error,
by design.

```ts
// In a bench file, or in a `@ac-bench/measure-*` registration API.
import { registerCase, registerCondition } from "@ac-bench/core/runner";

// In the CLI, or in a third-party measure or reporter package.
import { defineReporterPlugin, partitionPlugins } from "@ac-bench/core/plugin";
```

## Writing a plugin

A measure plugin is built with `defineMeasurePlugin`, a reporter plugin with
`defineReporterPlugin`. Both are branded, so `isMeasurePlugin` /
`isReporterPlugin` recognise them nominally and `partitionPlugins` can sort a
mixed list into the two the run actually takes.

**A package default-exports a factory when it has options to take, and the
plugin itself when it has none.** That rule is the same for both kinds and is
settled per package by whether there is anything to configure:
`@ac-bench/reporter-json` takes an output path and exports
`jsonReporter(options?)`; `@ac-bench/reporter-table` writes to the run's own
output stream and exports the plugin.

A reporter therefore carries no options across any boundary: they are applied
where the plugin is constructed, in a type-checked config file. That is why
`ReporterPlugin` has no `parseOptions` mirror of `MeasurePlugin`'s
`parseCaseResult` — a measure's results cross a process boundary as `unknown`
and must be re-validated, a reporter's options never leave the scope that wrote
them.

Everything host-bound a reporter needs — its output streams, the terminal, the
run's environment — arrives in the `ReporterContext` its `createSink` is given,
so a reporter package needs no `node:` import of its own.
