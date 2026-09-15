# @ac-bench/reporter-csv

Writes a benchmark run as CSV, one table per measure separated by a blank line,
when the run ends. For feeding results to a spreadsheet or a plotting tool.

```ts
import { defineConfig } from "@ac-bench/cli";
import csvReporter from "@ac-bench/reporter-csv";

export default defineConfig({
  plugins: [csvReporter({ output: "artifacts/bench.csv" })],
  reporters: ["csv"],
});
```

`output` defaults to the run's output base name plus `.csv`. The default export
is a factory because there is something to configure; call it with no arguments
for the defaults.

`@ac-bench/cli` already depends on this package and selects it by id, so listing
it in `plugins` is only necessary to pass options.
