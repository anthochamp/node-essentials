# @ac-bench/reporter-json

Writes a benchmark run to a single JSON document, one section per measure, when
the run ends. The section's shape is whatever the measure's own plugin produces:
this reporter adds no schema of its own.

```ts
import { defineConfig } from "@ac-bench/cli";
import jsonReporter from "@ac-bench/reporter-json";

export default defineConfig({
  plugins: [jsonReporter({ output: "artifacts/bench.json" })],
  reporters: ["json"],
});
```

`output` defaults to the run's output base name plus `.json`. The default export
is a factory because there is something to configure; call it with no arguments
for the defaults.

`@ac-bench/cli` already depends on this package and selects it by id, so listing
it in `plugins` is only necessary to pass options.
