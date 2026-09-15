# @ac-bench/cli

The benchmark CLI: argument parsing, config-file loading, and the resolution of
everything a run needs — which reporters to use, what `--mode` stands for, where
output files go.

The engine underneath is `@ac-bench/lib`, which takes those already resolved.
Use it directly to run benchmarks from your own code instead of a config file.

## Configuration

```ts
// bench.config.ts
import { defineConfig } from "@ac-bench/cli";
import durationPlugin from "@ac-bench/measure-duration/plugin";
import jsonReporter from "@ac-bench/reporter-json";

export default defineConfig({
  plugins: [durationPlugin, jsonReporter({ output: "artifacts/bench.json" })],
  reporters: ["table", "json"],
});
```

`plugins` holds measure and reporter plugins together — import each package and
list what it exports. A package that takes options default-exports a factory
(`jsonReporter({ … })`); one that does not default-exports the plugin
(`durationPlugin`).

`reporters` selects which reporters run, by id. `"table"`, `"json"`,
`"markdown"` and `"csv"` resolve to the reporters this CLI ships, with their
default options; any other id must name a reporter listed in `plugins`.

Listing a reporter in `plugins` **configures** it, it does not select it. That
separation is what lets `--reporter csv` turn on a reporter the config file has
already configured, without naming it twice.

Every option resolves in the same order: **command-line flag, then config file,
then default**.

## Configuring a built-in reporter

Construct it yourself in `plugins` and keep selecting it by name — the
configured instance wins over the built-in of the same id:

```ts
export default defineConfig({
  plugins: [jsonReporter({ output: "artifacts/bench.json" })],
  reporters: ["json"],
});
```
