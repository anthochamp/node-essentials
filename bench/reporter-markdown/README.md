# @ac-bench/reporter-markdown

Writes a benchmark run as a GitHub-flavoured Markdown document, one table per
measure, when the run ends. Suited to pasting into a pull request or committing
next to the code the numbers describe.

```ts
import { defineConfig } from "@ac-bench/cli";
import markdownReporter from "@ac-bench/reporter-markdown";

export default defineConfig({
  plugins: [markdownReporter({ output: "docs/benchmarks.md" })],
  reporters: ["markdown"],
});
```

`output` defaults to the run's output base name plus `.md`. The default export
is a factory because there is something to configure; call it with no arguments
for the defaults.

`@ac-bench/cli` already depends on this package and selects it by id, so listing
it in `plugins` is only necessary to pass options.
